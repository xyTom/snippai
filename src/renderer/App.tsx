
import './App.css';
import React, { useState,useEffect } from 'react';
import gemini from './models/gemini';
import logo from './assets/logo.png';
import DisplayTextResult from './components/displayTextResult';
import LoadingSkeleton from './components/loadingSkeleton';

declare global {
  interface Window {
    electronAPI: any;
  }
}



function App() {
  const [screenShotResult, setscreenShotResult] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  //When user enter text in the textarea, update the result
  const handleTextChange = (text: string) => {
    console.log("handleTextChange", text)
    setResult(text)
  }
  // window.electronAPI.onScreenShotRes((value:string) => {
  //   console.log('onScreenShotRes', value);
  //   setscreenShotResult(value);
  //   gemini(value).then((res) => {
  //     console.log('gemini res', res);
  //     setResult(res);
  //   });
  // })
  useEffect(() => {
    const handler = (value: string) => {
      console.log('onScreenShotRes', value);
      setscreenShotResult(value);
      setResult(null);
      setLoading(true);
      gemini(value).then((res) => {
        console.log('gemini res', res);
        setLoading(false);
        setResult(res);
      });
    };
  //check if there exists electronAPI, if exists, then it is running in electron, if not, it is running in browser
    if (window.electronAPI) {
      window.electronAPI.onScreenShotRes(handler);
      return () => {
        window.electronAPI.removeAllListeners('screenshot-result');
      };
    } 
  }); // Only run the effect on mount

  //check platform to show the correct shortcut
  const platform = window.navigator.platform;
  let shortcut = 'Ctrl + Shift + A';
  if (platform === 'MacIntel') {
    shortcut = 'Command + Shift + A';
  }

  return (
    <div className="App dark">
      <header className="App-header">
        {/* <!-- if no screenshot result, show the logo --> */}
        {!screenShotResult && <img src={logo} className="App-logo" alt="logo" />}
        <p className="mb-2">
          Press <code>{shortcut}</code> to make a screenshot.
        </p>
        {/* <!-- if has screenshot result, show the result --> */}
        {screenShotResult && <img src={`data:image/png;base64,${screenShotResult}`} alt="screenshot" className="max-w-full mb-2" />}
        <div>
        {/* {result && <p>{result}</p>} */}
      </div>
      {/* {result && <button onClick={() => {
        navigator.clipboard.writeText(result)
      }
      }>Copy</button>} */}
      {loading && <LoadingSkeleton /> }
      {result &&
      <DisplayTextResult text={result} onTextChange={handleTextChange} />
      }
      
      </header>
     
    </div>
  );
}

export default App;