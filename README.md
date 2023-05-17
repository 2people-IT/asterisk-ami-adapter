# @2people.it/asterisk-ami-adapter

![release](https://github.com/2people-IT/asterisk-ami-adapter/actions/workflows/release.yml/badge.svg)
![lint-and-test](https://github.com/2people-IT/asterisk-ami-adapter/actions/workflows/lint-and-test.yml/badge.svg)
![jekyll-gh-pages](https://github.com/2people-IT/asterisk-ami-adapter/actions/workflows/jekyll-gh-pages.yml/badge.svg)

It is a Node.js based solution for connecting to the Asterisk Manager Interface (AMI) via socket. AMI is a protocol for controlling, monitoring, and configuring an Asterisk PBX. This repository provides a flexible and efficient way to interact with the AMI, enabling developers to automate tasks, gather information about the system and users, and create custom applications for managing Asterisk.

To install the package, simply run the command
```
npm install @2people.it/asterisk-ami-adapter
```

The main class of the repository, ```AsteriskAmiAdapter```, extends from ```EventEmitter``` and provides a simple and straightforward way to connect to the AMI.
The ``connect`` function establishes the connection, while the ```disconnect``` function terminates it. These functions allow you to quickly and easily manage your connection, giving you full control over your interactions with the AMI. Additionally, the ```sendAction``` function allows you to send AMI actions, allowing you to control and configure the system.

In addition to these functions, the class also emits several socket events that allow you to monitor the state of the connection and take appropriate actions in response to changes. The socket events are:
```
ami_connect // throw system socket event
ami_data // arise after incoming any message from ami
ami_login // arise after incoming successfull login message from ami
ami_socket_drain // throw  system socket event
ami_socket_error // throw system socket event
ami_socket_timeout // throw system socket event
ami_socket_end // throw system socket event
ami_socket_close // throw system socket event
ami_socket_unwritable // throw system socket event
```
With these events, you'll be able to handle various connection-related events, such as a successful login or a socket error.

One of the advantages of this repository is that it does not have any external dependencies. The adapter was written using only native Node.js modules, making it lightweight and easy to maintain. The repository is written in TypeScript, providing a strongly-typed and maintainable codebase. It uses modern programming techniques and patterns, making it easy to use and integrate into other projects. The adapter is built with scalability and performance in mind, making it a reliable and fast choice for projects of any size.

Whether you're looking to automate routine tasks, build custom applications, or integrate with other systems, asterisk-ami-adapter is the right tool for you. With its simple API and well-documented source code, you'll be able to get started quickly and take advantage of the full power of Asterisk AMI. So, check out the repository today, and take your Asterisk integration to the next level!"

## Auto-generated documentation

https://2people-it.github.io/asterisk-ami-adapter

## Features

* **Typescript**
* **Zero dependiences**

## Getting started example

```
import { AsteriskAmiAdapter } from '@2people.it/asterisk-ami-adapter';

const adapter = new AsteriskAmiAdapter({
  host: '127.0.0.1',
  password: "password",
  port: 5038,
  username: "username",
});

adapter.connect();

adapter.on('ami_connect', () => {
  console.log('Connected to AMI');
});

adapter.on('ami_login', () => {
  console.log('Login successful');

  adapter.sendAction({
    Action: 'CoreShowChannels'
  });

  // if u need pass any variables, pass it to Array
  adapter.sendAction({
    Action: "Status",
    Variables: ["VAR_1", "VAR_2"],
  });
});

adapter.on('ami_data', (data) => {
  console.log(data);
});

adapter.on('ami_socket_error', (error) => {
  console.error(error);
});

```
