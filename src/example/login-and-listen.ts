/* eslint-disable no-console */

import { setTimeout as setTimeoutPromise } from "node:timers/promises";

import { AsteriskAmiAdapter, Types } from "../index.js";

const config = {
	AMI_HOST: process.env.AMI_HOST || "localhost",
	AMI_PASSWORD: process.env.AMI_PASSWORD || "password",
	AMI_PORT: process.env.AMI_PORT || "5038",
	AMI_USER: process.env.AMI_USER || "username",
};

const asteriskAmiConnector = new AsteriskAmiAdapter(
	{
		encoding: "ascii",
		events: true,
		host: config.AMI_HOST,
		password: config.AMI_PASSWORD,
		port: Number(config.AMI_PORT),
		reconnect: true,
		reconnectDelay: 5000,
		username: config.AMI_USER,
	},
	{
		filePath: "temp.log",
		isDebugEnabled: true,
		isWriteToFileEnabled: true,
	},
);

asteriskAmiConnector.connect();

asteriskAmiConnector.on("ami_login", (data: Types.TAmiEvent) => {
	console.log("ami_login =>", JSON.stringify(data));

	asteriskAmiConnector.sendAction({
		Action: "STATUS",
	}, (error, data) => {
		if (error) return console.error(error.message);

		console.log("Action: 'STATUS' data =>", JSON.stringify(data));
	});
});

asteriskAmiConnector.on("ami_data", (data: Types.TAmiEvent) => {
	console.log("ami_data =>", JSON.stringify(data));
});

asteriskAmiConnector.on("ami_socket_drain", () => {
	console.log("ami_socket_drain");
});

asteriskAmiConnector.on("ami_socket_error", (error: Error) => {
	console.log("ami_socket_error", error.message);
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
	await setTimeoutPromise(60 * 60 * 1000);
	asteriskAmiConnector.disconnect();
})();
