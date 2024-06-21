import EventEmitter from "node:events";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";

import * as Types from "../types/index.js";

export class AsteriskAmiAdapter extends EventEmitter {
	#NEW_LINE = "\r\n";
	#NEW_LINE_DOUBLE = this.#NEW_LINE + this.#NEW_LINE;
	#asteriskOptions: Types.TAsteriskOptions;
	#buffer = "";
	#callbacksMap: Map<string, { callback: Types.TCallBack; timer: NodeJS.Timeout; }> = new Map();
	#callbackTTL: number;
	#debugOptions?: Types.TDebugOptions & { logger: Console; writeStream?: fs.WriteStream; };
	#isReady: boolean;
	#net = net;
	#socket?: net.Socket;

	/**
	 * Creates a new AsteriskAmiAdapter instance.
	 *
	 * @param {Types.TAsteriskOptions} [asteriskOptions] - Options for the Asterisk connection.
	 * @param {Types.TDebugOptions} [debugOptions] - Options for debugging.
	 */
	constructor(
		asteriskOptions: Types.TAsteriskOptions,
		debugOptions?: Types.TDebugOptions,
	) {
		super();

		this.#asteriskOptions = { ...asteriskOptions };
		this.#callbackTTL = asteriskOptions.callBackTTL || 10000;
		if (this.#callbackTTL <= 0) throw new Error("Invalid asteriskOptions.callBackTTL");

		this.#debugOptions = debugOptions?.isDebugEnabled ? {
			filePath: debugOptions.filePath,
			isDebugEnabled: debugOptions.isDebugEnabled,
			isWriteToFileEnabled: debugOptions.isWriteToFileEnabled,
			logger: console,
			writeStream: debugOptions.isWriteToFileEnabled
				? fs.createWriteStream(debugOptions.filePath ?? "temp.log", { flags: "a" })
				: undefined,
		} : undefined;

		this.#isReady = false;
	}

	#authCreds = (): Types.TAmiMessageIn => ({
		Action: "login",
		Events: this.#asteriskOptions.events
			? "on"
			: "off",
		Secret: this.#asteriskOptions.password,
		Username: this.#asteriskOptions.username,
	});

	#debug(
		data: string | string[] | object,
		level: "ERROR" | "INFO" | "WARN",
	): void {
		if (!this.#debugOptions) return;

		const debugged = [];

		if (typeof data === "object") {
			debugged.push(JSON.stringify(data));
		} else {
			if (Array.isArray(data)) {
				debugged.push(...data);
			} else {
				debugged.push(data);
			}
		}

		const logMethods = {

			ERROR: "error",
			INFO: "log",
			WARN: "warn",
		} as const;

		const method = logMethods[level];

		this.#debugOptions.logger[method](`[${Date.now()}]: [${level}] ` + debugged.join(this.#NEW_LINE));
		if (this.#debugOptions.isWriteToFileEnabled && this.#debugOptions.writeStream) {
			const debugged = [];

			if (typeof data === "object") {
				debugged.push(JSON.stringify(data));
			} else {
				if (Array.isArray(data)) {
					debugged.push(...data);
				} else {
					debugged.push(data);
				}
			}

			this.#debugOptions.writeStream.write(`[${Date.now()}]: [${level}] ` + debugged.join(this.#NEW_LINE) + this.#NEW_LINE, "utf-8");
		}
	}

	#generateSocketData(data: Types.TAmiMessageToSocket): string {
		let str = "";

		for (const i in data) {
			const value = data[i];

			if (Array.isArray(value)) {
				const strings = value.map((e) => i + ": " + e);

				str = str.concat(strings.join(this.#NEW_LINE)) + this.#NEW_LINE;
			} else {
				str += (i + ": " + value + this.#NEW_LINE);
			}
		}

		return str + this.#NEW_LINE;
	}

	#getFormattedUuid = crypto.randomUUID;

	#processData(data: string) {
		if (data.substring(0, 21) === "Asterisk Call Manager") {
			data = data.substring(data.indexOf(this.#NEW_LINE) + 2);
		}

		this.#buffer += data;
		const result: { ActionID?: string; Message?: string; Response?: string; Event?: string; }[] = [];
		const eventsRaw = this.#buffer.split(this.#NEW_LINE_DOUBLE);
		const isEndExists = eventsRaw.at(-1) === this.#NEW_LINE;

		eventsRaw.pop();
		if (!isEndExists) {
			this.#buffer = this.#buffer.substring(this.#buffer.lastIndexOf(this.#NEW_LINE_DOUBLE));
		} else {
			this.#buffer = "";
		}

		for (const eventRaw of eventsRaw) {
			const preparedEvents = eventRaw.split(this.#NEW_LINE);

			if (
				preparedEvents.length === 1
				&& !preparedEvents[0]
			) continue;

			const event: Types.TAmiEvent = preparedEvents.reduce((p: Types.TAmiMessageOut, c: string) => {
				const [key, value]: string[] = c.split(": ", 2);

				if (!key || !value) return p;

				if (key === "Variable") {
					const [k, v] = value.split("=");

					if (!p.Variable) p.Variable = {};
					if (k && v) p.Variable[k] = v;
				} else {
					p[key] = value;
				}

				return p;
			}, {});

			result.push(event);
		}

		return result;
	}

	#send(data: Types.TAmiMessageIn & Types.TAmiMessageToSocket, callback?: Types.TCallBack) {
		if (!data.ActionID) data.ActionID = this.#getFormattedUuid();

		const actionID = data.ActionID;

		if (this.#socket?.writable) {
			this.#debug("----- START SEND ----", "INFO");
			const payload = this.#generateSocketData(data);

			this.#debug(payload, "INFO");

			if (callback) {
				this.#callbacksMap.set(actionID, {
					callback,
					timer: setTimeout(() => {
						if (this.#callbacksMap.has(actionID)) {
							callback(new Error("Ami server did not get answer"), null);
							this.#callbacksMap.delete(actionID);
						}
					}, this.#callbackTTL),
				});
			}

			this.#socket.write(
				payload,
				this.#asteriskOptions.encoding,
				// cb,
			);

			this.#debug("----- END SEND ----", "INFO");
		} else {
			this.#debug("cannot write to Asterisk Socket", "ERROR");
			this.emit("ami_socket_unwritable");
		}
	}

	connect(): void {
		this.#debug(`Connecting to Asterisk host ${this.#asteriskOptions.host}:${this.#asteriskOptions.port}`, "INFO");

		const socket = this.#net
			.createConnection(this.#asteriskOptions.port, this.#asteriskOptions.host);

		socket.setEncoding(this.#asteriskOptions.encoding);
		socket.setKeepAlive(true, 500);

		socket.on("connect", () => {
			this.emit("ami_connect");

			const callback: Types.TCallBack = (error, data) => {
				if (error instanceof Error) {
					return this.emit("ami_socket_error", error);
				}

				this.#isReady = true;
				this.emit("ami_login", data);
			};

			this.#send(this.#authCreds(), callback);
		});

		socket.on("data", (data: string) => {
			this.#debug("----- NEW DATA ----", "INFO");
			const allEvents = this.#processData(data);

			this.#debug(allEvents, "INFO");

			for (const event of allEvents) {
				if (event.ActionID) {
					const data = this.#callbacksMap.get(event.ActionID);

					if (data?.callback) {
						if (event.Response === "Success") {
							data.callback(null, event);
						} else {
							data.callback(new Error(event.Message), null);
						}

						clearTimeout(data.timer);
						this.#callbacksMap.delete(event.ActionID);
					}
				}

				this.emit("ami_data", event);
			}
			this.#debug("----- END DATA ----", "INFO");
		});

		socket.on("drain", () => {
			this.#debug("DRAIN. Asterisk Socket connection drained", "WARN");
			this.emit("ami_socket_drain");
		});

		socket.on("error", (error: Error) => {
			if (error) {
				this.#debug("ERROR. Asterisk Socket connection error, error was: " + error, "ERROR");
			}
			this.emit("ami_socket_error", error);
		});

		socket.on("timeout", () => {
			this.#debug("TIMEOUT. Asterisk Socket connection has timed out", "WARN");
			this.emit("ami_socket_timeout");
		});

		socket.on("end", () => {
			this.#debug("END. Asterisk Socket connection ran end event", "INFO");
			this.emit("ami_socket_end");
		});

		socket.on("close", async (hadError: boolean) => {
			this.#debug("CLOSE. Asterisk Socket connection closed, hadError - " + hadError, "WARN");
			this.emit("ami_socket_close", hadError);

			this.#isReady = false;

			if (this.#asteriskOptions.reconnect) {
				this.#debug("Reconnecting to Asterisk after " + this.#asteriskOptions.reconnectDelay + "ms", "INFO");
				await setTimeoutPromise(this.#asteriskOptions.reconnectDelay);

				this.connect();
			}
		});

		this.#socket = socket;
	}

	disconnect(): void {
		if (this.#socket) {
			this.#debug("disconnect", "INFO");
			this.#asteriskOptions.reconnect = false;
			this.#socket.end(this.#generateSocketData({ Action: "Logoff" }));
		}
	}

	destroy(): void {
		if (this.#socket) {
			this.#debug("destroy", "INFO");
			this.#socket.destroy();
		}
	}

	getGenerateSocketData = this.#generateSocketData;

	getProcessData = this.#processData;

	sendAction(data: Types.TAmiMessageIn & Types.TAmiMessageToSocket, callback: Types.TCallBack) {
		if (!this.#isReady) {
			this.#debug("Connection is not established", "ERROR");

			return;
		}

		return this.#send(data, callback);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	on(eventName: Types.TAmiEventType, listener: (...args: any[]) => void): this {
		return super.on(eventName, listener);
	}
}
