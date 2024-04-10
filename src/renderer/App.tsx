
import './App.css';
import React, { useState,useEffect,useRef } from 'react';
import gemini from './models/gemini';
import logo from './assets/logo.png';
import DisplayTextResult from './components/displayTextResult';
import LoadingSkeleton from './components/loadingSkeleton';
import { Badge } from "./components/ui/badge"
import ModelSelect from './components/modelSelect';
declare global {
  interface Window {
    electronAPI: any;
  }
}



function App() {
  const [screenShotResult, setscreenShotResult] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  //Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);
  // Create a reference to the worker object.
  const worker = useRef(null);
  //When user enter text in the textarea, update the result
  const handleTextChange = (text: string) => {
    console.log("handleTextChange", text)
    setResult(text)
  }
  const handleModelChange = (value: string) => {
    console.log('handleModelChange', value);
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
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }
        // Create a callback function for messages from the worker thread.
        const onMessageReceived = (e:any) => {
          switch (e.data.status) {
            case 'initiate':
              // Model file start load: add a new progress item to the list.
              setReady(false);
              setProgressItems(prev => [...prev, e.data]);
              break;
    
            case 'progress':
              // Model file progress: update one of the progress items.
              setProgressItems(
                prev => prev.map(item => {
                  if (item.file === e.data.file) {
                    return { ...item, progress: e.data.progress }
                  }
                  return item;
                })
              );
              break;
    
            case 'done':
              // Model file loaded: remove the progress item from the list.
              setProgressItems(
                prev => prev.filter(item => item.file !== e.data.file)
              );
              break;
    
            case 'ready':
              // Pipeline ready: the worker is ready to accept messages.
              setReady(true);
              break;
    
            case 'update':
              // Generation update: update the output text.
              console.log(e.data.output);
              break;
    
            case 'complete':
              // Generation complete: re-enable the "Translate" button
              setDisabled(false);
              break;
          }
        }
    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

  //check if there exists electronAPI, if exists, then it is running in electron, if not, it is running in browser
    if (window.electronAPI) {
      window.electronAPI.onScreenShotRes(handler);
      return () => {
        window.electronAPI.removeAllListeners('screenshot-result');
          // Define a cleanup function for when the component is unmounted.
        worker.current.removeEventListener('message', onMessageReceived);
      };
    } else{
        // Define a cleanup function for when the component is unmounted.
      return () => {
        worker.current.removeEventListener('message', onMessageReceived);
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

      <header className="App-header relative">
      <div className="flex	h-8 px-4 md:px-6 w-full shrink-0 absolute top-[0.5rem] right-0">
      <div className="hidden sm:flex" >
        <span className="sr-only">Snippai</span>
      </div>
      <div className="ml-auto space-x-4 flex text-white">
        <ModelSelect handleModelChange={handleModelChange} />
      </div>
    </div>
        {/* <!-- if no screenshot result, show the logo --> */}
        {!screenShotResult && <img src={logo} className="App-logo" alt="logo" />}
        {!screenShotResult &&<p className="mb-2">
          Press <code>{shortcut}</code> to make a screenshot.
        </p>}
        {/* <!-- if has screenshot result, show the result --> */}
        {screenShotResult && <Badge variant="secondary"
        className='mb-2 antialiased font-medium'
        >
          <ImageIcon className="w-5 h-5 mr-1" />
          Screenshot</Badge> }

        {screenShotResult && <img src={`data:image/png;base64,${screenShotResult}`} alt="screenshot" className="max-w-[90%] mb-2 rounded-lg object-center border border-gray-100 dark:border-gray-800" />}
        <div>
        {/* {result && <p>{result}</p>} */}
      </div>
      {/* {result && <button onClick={() => {
        navigator.clipboard.writeText(result)
      }
      }>Copy</button>} */}
      {loading && <LoadingSkeleton /> }
      {result && 
      <Badge variant="secondary"
      className='mb-2 antialiased font-medium'
      >
        <FileIcon className="w-5 h-5 mr-1" />
        Result</Badge>
      }
      {result &&
      <DisplayTextResult text={result} onTextChange={handleTextChange} />
      }
      
      </header>
     
    </div>
  );
}
function ImageIcon(props:React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

function FileIcon(props:React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default App;