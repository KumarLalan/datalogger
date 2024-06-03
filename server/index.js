const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const isCloudEnvironment = process.env.IS_CLOUD === 'true';

let SerialPort, ReadlineParser, port, parser;

if (isCloudEnvironment) {
  SerialPort = function() {
    this.write = (command, callback) => {
      console.log(`Mock write: ${command}`);
      if (callback) callback();
    };
    this.on = (event, callback) => {
      console.log(`Mock event: ${event}`);
    };
    this.pipe = () => this;
  };
  ReadlineParser = function() {
    return this;
  };
  console.log('Running in cloud environment, using mock serial port');
} else {
  const { SerialPort } = require('serialport');
  const { ReadlineParser } = require('@serialport/parser-readline');
  port = new SerialPort({
    path: 'COM3',
    baudRate: 115200
  });
  parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  port.on('open', () => {
    console.log('Serial Port Opened');
  });

  parser.on('data', (data) => {
    console.log('Data:', data);
    io.emit('serialData', data);
  });
}

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('command', (command) => {
    console.log('Received command:', command);
    if (port) {
      port.write(command + '\n', (err) => {
        if (err) {
          return console.log('Error on write:', err.message);
        }
        console.log('Command written to serial port');
      });
    } else {
      console.log(`Mock command execution: ${command}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
