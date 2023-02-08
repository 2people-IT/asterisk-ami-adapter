import fs, { WriteStream } from "node:fs";
import net, { Socket } from "node:net";
import EventEmitter from "node:events";
import { randomUUID } from "node:crypto";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";

import * as Types from "../types";

export class AsteriskAmiAdapter extends EventEmitter {
	#net = net;
	#buffer = "";
	#NEW_LINE = "\r\n";
	#NEW_LINE_DOUBLE = this.#NEW_LINE + this.#NEW_LINE;
	#socket?: Socket;
	#port: number;
	#host: string;
	#username: string;
	#password: string;
	#isDebugEnabled: boolean;
	#isWriteToFileEnabled: boolean;
	#writeStream?: WriteStream;
	#reconnect: boolean;
	#reconnectDelay: number;
	#identifier?: string;
	#encoding: BufferEncoding = "ascii";
	#logger: Console;
	#events: boolean;
	#isReady: boolean;
	#callbacksMap: Map<string, { callback: Types.TCallBack; timer: NodeJS.Timeout; }> = new Map();

	constructor(params = {
		host: "localhost",
		password: "password",
		port: 5038,
		username: "username",
	}, options: Types.TOptions = {
		debug: false,
		encoding: "ascii",
		events: false,
		identifier: undefined,
		logger: undefined,
		reconnect: false,
		reconnectDelay: 3000,
		writeToFile: false,
	}) {
		super();

		this.#port = params.port;
		this.#host = params.host;
		this.#username = params.username;
		this.#password = params.password;

		this.#isDebugEnabled = options.debug;
		this.#isWriteToFileEnabled = options.writeToFile;
		this.#writeStream = this.#isWriteToFileEnabled
			? fs.createWriteStream("temp.log", { flags: "a" })
			: this.#writeStream;
		this.#reconnect = options.reconnect;
		this.#reconnectDelay = options.reconnectDelay;
		this.#identifier = options.identifier;
		this.#encoding = options.encoding || this.#encoding;
		this.#logger = console;
		this.#events = options.events;

		this.#isReady = false;
	}

	#authCreds = (): Types.TAmiMessageIn => ({
		Action: "login",
		Events: this.#events ? "on" : "off",
		Secret: this.#password,
		Username: this.#username,
	});

	#debug(data: string | string[] | object): void {
		if (this.#isDebugEnabled) {
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

			this.#logger.log(debugged.join(this.#NEW_LINE));
		}
		if (this.#isWriteToFileEnabled && this.#writeStream) {
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

			this.#writeStream.write(debugged.join(this.#NEW_LINE) + this.#NEW_LINE, "utf-8");
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

	#getFormatedUuid = randomUUID;

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

				if (!key) return p;

				if (key === "Variable") {
					if (!p.Variable) {
						p.Variable = {};
					}

					if (value) {
						const [k, v] = value.split("=");

						p.Variable[k] = v;
					}
				} else {
					p[key] = value;
				}

				return p;
			}, {});

			if (this.#identifier) event.Identifier = this.#identifier;

			result.push(event);
		}

		return result;
	}

	#send(data: Types.TAmiMessageIn & Types.TAmiMessageToSocket, callback?: Types.TCallBack) {
		if (!data.ActionID) data.ActionID = this.#getFormatedUuid();

		const actionID = data.ActionID;

		if (this.#socket?.writable) {
			this.#debug("----- SEND ----");
			const payload = this.#generateSocketData(data);

			this.#debug(payload);

			if (callback) {
				this.#callbacksMap.set(actionID, {
					callback,
					timer: setTimeout(() => {
						if (this.#callbacksMap.has(actionID)) {
							callback(new Error("Ami server did not get answer"), null);
							this.#callbacksMap.delete(actionID);
						}
					}, 10000),
				});
			}

			this.#socket.write(
				payload,
				this.#encoding,
				// cb,
			);

			this.#debug("----- SENDED ----");
		} else {
			this.#debug("cannot write to Asterisk Socket");
			this.emit("ami_socket_unwritable");
		}
	}

	connect(): void {
		this.#debug(`Connecting to Asterisk host ${this.#host}:${this.#port}`);

		const socket = this.#net.createConnection(this.#port, this.#host);

		socket.setEncoding(this.#encoding);
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
			this.#debug("----- NEW DATA ----");
			const allEvents = this.#processData(data);

			this.#debug(allEvents);

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
			this.#debug("----- END DATA ----");
		});

		socket.on("drain", () => {
			this.#debug("DRAIN. Asterisk Socket connection drained");
			this.emit("ami_socket_drain");
		});

		socket.on("error", (error: Error) => {
			if (error) {
				this.#debug("ERROR. Asterisk Socket connection error, error was: " + error);
			}
			this.emit("ami_socket_error", error);
		});

		socket.on("timeout", () => {
			this.#debug("TIMEOUT. Asterisk Socket connection has timed out");
			this.emit("ami_socket_timeout");
		});

		socket.on("end", () => {
			this.#debug("END. Asterisk Socket connection ran end event");
			this.emit("ami_socket_end");
		});

		socket.on("close", async (isHaveError: boolean) => {
			this.#debug("CLOSE. Asterisk Socket connection closed, error status - " + isHaveError);
			this.emit("ami_socket_close", isHaveError);

			this.#isReady = false;

			if (this.#reconnect) {
				this.#debug("Reconnecting to Asterisk after " + this.#reconnectDelay + "ms");
				await setTimeoutPromise(this.#reconnectDelay);

				this.connect();
			}
		});

		this.#socket = socket;
	}

	disconnect(): void {
		if (this.#socket) {
			this.#debug("disconnect");
			this.#reconnect = false;
			this.#socket.end(this.#generateSocketData({ Action: "Logoff" }));
		}
	}

	destroy(): void {
		if (this.#socket) {
			this.#debug("destroy");
			this.#socket.destroy();
		}
	}

	getGenerateSocketData = this.#generateSocketData;

	getProcessData = this.#processData;

	sendAction(data: Types.TAmiMessageIn & Types.TAmiMessageToSocket, callback: Types.TCallBack) {
		if (!this.#isReady) {
			return this.#logger.warn("Connection is not established");
		}

		return this.#send(data, callback);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	on(eventName: Types.TAmiEventType, listener: (...args: any[]) => void): this {
		return super.on(eventName, listener);
	}
}
