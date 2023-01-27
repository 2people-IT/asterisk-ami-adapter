/* eslint-disable no-console */

import { setTimeout as setTimeoutPromise } from "node:timers/promises";

import { AsteriskAmiAdapter, Types } from "..";

const config = {
	AMI_HOST: process.env.AMI_HOST || "localhost",
	AMI_INDENTIFIER: process.env.AMI_INDENTIFIER || "test",
	AMI_PASSWORD: process.env.AMI_PASSWORD || "password",
	AMI_PORT: process.env.AMI_PORT || "5038",
	AMI_USER: process.env.AMI_USER || "username",
};

const asteriskAmiConnector = new AsteriskAmiAdapter({
	host: config.AMI_HOST,
	password: config.AMI_PASSWORD,
	port: Number(config.AMI_PORT),
	username: config.AMI_USER,
}, {
	debug: false,
	encoding: "ascii",
	events: true,
	identifier: config.AMI_INDENTIFIER,
	reconnect: true,
	reconnectDelay: 5000,
	writeToFile: false,
});

asteriskAmiConnector.connect();

asteriskAmiConnector.on("ami_login", (data: Types.TAmiEvent) => {
	console.log("ami_login", data);
});

asteriskAmiConnector.on("ami_data", (data: Types.TAmiEvent) => {
	console.log(data);
});

asteriskAmiConnector.on("ami_socket_drain", () => {
	console.log("ami_socket_drain");
});

asteriskAmiConnector.on("ami_socket_error", (error: Error) => {
	console.log("ami_socket_error", error);
});

asteriskAmiConnector.on("ami_socket_timeout", () => {
	console.log("ami_socket_timeout");
});

asteriskAmiConnector.on("ami_socket_end", () => {
	console.log("ami_socket_end");
});

asteriskAmiConnector.on("ami_socket_close", (isHaveError: boolean) => {
	console.log("ami_socket_close", isHaveError);
});

asteriskAmiConnector.on("ami_socket_unwritable", () => {
	console.log("ami_socket_unwritable");
});

(async function disconnect() {
	await setTimeoutPromise(60000);
	asteriskAmiConnector.disconnect();
})();
