import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
});

function App() {
  const [responses, setResponses] = useState([]);
  const [deviceNames, setDeviceNames] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [bleState, setBleState] = useState('stop');
  const [bleData, setBleData] = useState([]);
  const [showDeviceNames, setShowDeviceNames] = useState(false);
  const [showSelectedDevices, setShowSelectedDevices] = useState(false);
  const [showBleData, setShowBleData] = useState(false);
  const [filterManufacturerID, setFilterManufacturerID] = useState('');
 // const [filterI2CDataNum, setFilterI2CDataNum] = useState('');

  useEffect(() => {
    sendCommand('selected bleReset');
  }, []);

  useEffect(() => {
    socket.on('serialData', (data) => {
      console.log('Received serialData:', data);
      setResponses((prevResponses) => [...prevResponses, data]);

      if (bleState === 'start') {
        setBleData((prevData) => [...prevData, data]);
      }
    });

    return () => {
      socket.off('serialData');
    };
  }, [bleState]);

  const sendCommand = (commandToSend) => {
    console.log('Sending command:', commandToSend);
    socket.emit('command', commandToSend);
  };

  const toggleDevice = (deviceName) => {
    const commandToSend = `selected bleSet ${deviceName}`;
    sendCommand(commandToSend);

    if (selectedDevices.includes(deviceName)) {
      setSelectedDevices(selectedDevices.filter(name => name !== deviceName));
    } else {
      setSelectedDevices([...selectedDevices, deviceName]);
    }
  };

  const handleShowDevices = () => {
    sendCommand('update devices');
    sendCommand('show devices');
    setDeviceNames([]);
    setShowDeviceNames(true);
    setShowSelectedDevices(false);
    setShowBleData(false);
  };

  useEffect(() => {
    const names = responses
      .join('\n')
      .split('\n')
      .filter(response => response.startsWith('device'))
      .map(response => response.trim());

    // Remove duplicates from names
    const uniqueNames = [...new Set(names)];
    setDeviceNames(uniqueNames);
  }, [responses]);

  const handleShowSelected = () => {
    sendCommand('show selected');
    setShowDeviceNames(false);
    setShowSelectedDevices(true);
    setShowBleData(false);
  };

  const handleToggleBLE = () => {
    const bleCommand = bleState === 'start' ? 'stop ble' : 'start ble';
    sendCommand(bleCommand);
    setBleState(bleState === 'start' ? 'stop' : 'start');
    setShowDeviceNames(false);
    setShowSelectedDevices(false);
    setShowBleData(true);
  };

  const handleBleReset = () => {
    sendCommand('selected bleReset');
    setSelectedDevices([]);  // Reset selected devices state
    setBleData([]);  // Clear BLE data
    setShowBleData(false);  // Hide BLE data
  };

  const formatBleData = (data) => {
    if (data.trim().startsWith('{') && data.trim().endsWith('}')) {
      try {
        const strippedData = data.slice(1, -1);
        const formattedData = strippedData
          .split(',')
          .map(item => {
            const parts = item.split(':');
            return parts.length > 1 ? parts[1].trim() : '';
          })
          .filter(item => item)
          .join(' ');
        return formattedData;
      } catch (e) {
        console.error('Failed to format BLE data:', e);
        return data;
      }
    } else {
      return data;
    }
  };

  const filteredBleData = bleData.filter(data => {
    const formattedData = formatBleData(data).split(' ');
    const manufacturerID = formattedData[0];
   // const i2cDataNum = formattedData[3];
    const matchesManufacturerID = filterManufacturerID === '' || manufacturerID.includes(filterManufacturerID);
   // const matchesI2CDataNum = filterI2CDataNum === '' || i2cDataNum.includes(filterI2CDataNum);
  //  return matchesManufacturerID && matchesI2CDataNum;
    return matchesManufacturerID;
  });

  return (
    <div className="App">
      <header className="App-header">
        <h1>Mievo DataLogger</h1>
        <div className="button-container">
          <button className="action-btn" onClick={handleShowDevices}>Show Devices</button>
          <button className="action-btn" onClick={handleShowSelected}>Selected Devices</button>
          <button className="action-btn" onClick={handleToggleBLE}>{bleState === 'start' ? 'Stop BLE' : 'Start BLE'}</button>
          <button className="action-btn" onClick={handleBleReset}>Reset BLE</button>
        </div>
        
        {showBleData && (
          <div className="ble-data">
            <div className="filters">
              <input 
                type="text" 
                placeholder="Filter by Manufacturer ID" 
                value={filterManufacturerID} 
                onChange={(e) => setFilterManufacturerID(e.target.value)} 
              />
              {/* <input 
                type="text" 
                placeholder="Filter by I2C Data Num" 
                value={filterI2CDataNum} 
                onChange={(e) => setFilterI2CDataNum(e.target.value)} 
              /> */}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Manufacturer ID</th>
                  <th>Time_ms</th>
                  <th>Time_s</th>
                  <th>Vcc</th>
                  <th>I2C Data Num</th>
                  <th>RSSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredBleData
                  .filter(data => data.trim().startsWith('{') && data.trim().endsWith('}'))
                  .map((data, index) => {
                    const formattedData = formatBleData(data).split(' ');
                    return (
                      <tr key={index}>
                        {formattedData.map((value, i) => (
                          <td key={i}>{value}</td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        {showDeviceNames && (
          <div className="device-names">
            <table className="device-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Select</th>
                </tr>
              </thead>
              <tbody>
                {deviceNames.map((name, index) => (
                  <tr key={index}>
                    <td>{name}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={selectedDevices.includes(name)} onChange={() => toggleDevice(name)} />
                        <span className="slider round"></span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {showSelectedDevices && (
          <div className="selected-devices">
            <table className="device-table">
              <thead>
                <tr>
                  <th>Selected Devices</th>
                </tr>
              </thead>
              <tbody>
                {selectedDevices.map((device, index) => (
                  <tr key={index}>
                    <td>{device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
