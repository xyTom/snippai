import logo from './logo.png';
import './App.css';
import { useState } from 'react';


function App() {
  const [result, setresult] = useState(null);
  window.electronAPI.onScreenShotRes((value) => {
    console.log('onScreenShotRes', value);
    setresult(value);
  })
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Press <code>Ctrl + Shift + A</code> to make a screenshot.
        </p>
        {/* <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a> */}
        <div>
        {result && <p>{result}</p>}
      </div>
      {result && <button onClick={() => {
        navigator.clipboard.writeText(result)
      }
      }>Copy</button>}
      </header>

    </div>
  );
}

export default App;
