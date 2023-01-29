# @2people.it/asterisk-ami-adapter

It is a Node.js based solution for connecting to the Asterisk Manager Interface (AMI) via socket. AMI is a protocol for controlling, monitoring, and configuring an Asterisk PBX. This repository provides a flexible and efficient way to interact with the AMI, enabling developers to automate tasks, gather information about the system and users, and create custom applications for managing Asterisk.

To install the package, simply run the command
```
npm install @2people.it/asterisk-ami-adapter
```

The main class of the repository, ```AsteriskAmiAdapter```, extends from ```EventEmitter``` and provides a simple and straightforward way to connect to the AMI.
The ``connect`` function establishes the connection, while the ```disconnect``` function terminates it. These functions allow you to quickly and easily manage your connection, giving you full control over your interactions with the AMI. Additionally, the ```sendAction``` function allows you to send AMI actions, allowing you to control and configure the system.

In addition to these functions, the class also emits several socket events that allow you to monitor the state of the connection and take appropriate actions in response to changes. The socket events are:
```
ami_connect
ami_data
ami_login
ami_socket_drain
ami_socket_error
ami_socket_timeout
ami_socket_end
ami_socket_close
ami_socket_unwritable
```
With these events, you'll be able to handle various connection-related events, such as a successful login or a socket error.

One of the advantages of this repository is that it does not have any external dependencies. The adapter was written using only native Node.js modules, making it lightweight and easy to maintain. The repository is written in TypeScript, providing a strongly-typed and maintainable codebase. It uses modern programming techniques and patterns, making it easy to use and integrate into other projects. The adapter is built with scalability and performance in mind, making it a reliable and fast choice for projects of any size.

Whether you're looking to automate routine tasks, build custom applications, or integrate with other systems, asterisk-ami-adapter is the right tool for you. With its simple API and well-documented source code, you'll be able to get started quickly and take advantage of the full power of Asterisk AMI. So, check out the repository today, and take your Asterisk integration to the next level!"

## Features

* **Typescript**
* **Zero dependiences**
