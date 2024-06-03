const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline')

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const port = new SerialPort({
  path: 'COM3', 
  baudRate: 115200
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

port.on('open', () => {
  console.log('Serial Port Opened');
});

parser.on('data', (data) => {
  console.log('Data:', data);
  io.emit('serialData', data);
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('command', (command) => {
    console.log('Received command:', command);
    port.write(command + '\n', (err) => {
      if (err) {
        return console.log('Error on write:', err.message);
      }
      console.log('Command written to serial port');
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
