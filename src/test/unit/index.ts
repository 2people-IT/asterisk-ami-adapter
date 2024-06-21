import assert from "node:assert";
import test from "node:test";

import { AsteriskAmiAdapter } from "../../index.js";

const amiAdapter = new AsteriskAmiAdapter({
	encoding: "ascii",
	events: false,
	host: "localhost",
	password: "password",
	port: 5038,
	reconnect: false,
	reconnectDelay: 3000,
	username: "username",
});

test("Main checks", async (t) => {
	await t.test("prepare data event from ami", async () => {
		const reference = {
			Action: "Originate",
			ActionID: "76d0392a-b397-463f-a9fc-cc5ee49e0839",
			Async: "true",
			Channel: "Local/s@callback_op/n",
			Context: "callback_op-ext",
			Exten: "79000000000",
			Priority: "1",
			Variable: {
				CALL_DST: "78000000000",
				CALL_ID: "76d0392a-b397-463f-a9fc-cc5ee49e0839",
				CALL_QUEUE: "aa0f3f8e-87a7-4ec6-9ad5-673e90de057f",
				CALL_SRC: "79000000000",
				COMP_ID: "1f4d3f81-544c-ffc2-a798-074b23fb42db",
			},
		};

		let payload = "Action: Originate\r\n";

		payload += "ActionID: 76d0392a-b397-463f-a9fc-cc5ee49e0839\r\n";
		payload += "Async: true\r\n";
		payload += "Channel: Local/s@callback_op/n\r\n";
		payload += "Context: callback_op-ext\r\n";
		payload += "Exten: 79000000000\r\n";
		payload += "Priority: 1\r\n";
		payload += "Variable: CALL_DST=78000000000\r\n";
		payload += "Variable: CALL_ID=76d0392a-b397-463f-a9fc-cc5ee49e0839\r\n";
		payload += "Variable: CALL_QUEUE=aa0f3f8e-87a7-4ec6-9ad5-673e90de057f\r\n";
		payload += "Variable: CALL_SRC=79000000000\r\n";
		payload += "Variable: COMP_ID=1f4d3f81-544c-ffc2-a798-074b23fb42db\r\n\r\n";

		const result = amiAdapter.getProcessData(payload)[0];

		assert.equal(JSON.stringify(reference), JSON.stringify(result));
	});

	await t.test("prepare data to ami", async () => {
		let reference = "Action: Originate\r\n";

		reference += "ActionID: 76d0392a-b397-463f-a9fc-cc5ee49e08399\r\n";
		reference += "Async: true\r\n";
		reference += "Channel: Local/s@callback_op/n\r\n";
		reference += "Context: callback_op-ext\r\n";
		reference += "Exten: 79000000000\r\n";
		reference += "Priority: 1\r\n";
		reference += "Variable: CALL_DST=78000000000\r\n";
		reference += "Variable: CALL_ID=76d0392a-b397-463f-a9fc-cc5ee49e0839\r\n";
		reference += "Variable: CALL_POSITION=1\r\n";
		reference += "Variable: CALL_QUEUE=16d0392a-b391-463f-a9fc-cc5ee49e0839\r\n";
		reference += "Variable: CALL_SRC=79000000000\r\n";
		reference += "Variable: COMP_ID=1f4d3f81-544c-ffc2-a798-074b23fb42db\r\n\r\n";

		const payload = {
			Action: "Originate",
			ActionID: "76d0392a-b397-463f-a9fc-cc5ee49e08399",
			Async: "true",
			Channel: "Local/s@callback_op/n",
			Context: "callback_op-ext",
			Exten: "79000000000",
			Priority: "1",
			Variable: [
				"CALL_DST=78000000000",
				"CALL_ID=76d0392a-b397-463f-a9fc-cc5ee49e0839",
				"CALL_POSITION=1",
				"CALL_QUEUE=16d0392a-b391-463f-a9fc-cc5ee49e0839",
				"CALL_SRC=79000000000",
				"COMP_ID=1f4d3f81-544c-ffc2-a798-074b23fb42db",
			],
		};

		const result = amiAdapter.getGenerateSocketData(payload);

		assert.equal(JSON.stringify(reference), JSON.stringify(result));
	});
});
