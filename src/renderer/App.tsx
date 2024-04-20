
import './App.css';
import React, { useState,useEffect,useRef } from 'react';
import aiModels from './models';
import logo from './assets/logo.png';
import DisplayTextResult from './components/displayTextResult';
import LoadingSkeleton from './components/loadingSkeleton';
import { Badge } from "./components/ui/badge"
import ModelSelect from './components/modelSelect';
import ApiKeyInput from './components/apiKeyInput';
import PromptSelect from './components/promptSelect';
import { KeyRound } from "lucide-react"
import { Button } from "./components/ui/button"
import { promptOptions, models } from './lib/models';

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

  //AI model selection
  const [model, setModel] = useState('gemini');
  useEffect(() => {
    const model = localStorage.getItem('model');
    if (model) {
      setModel(model);
    }
  }, []);
  //read model list, if require api, create a dictionary to store the api key
  let keyMap = new Map();
  models.forEach((model) => {
    if (model.requireApiKey) {
      keyMap.set(model.value, '');
    }
  });

  const [apiKey, setApiKey] = useState('');
  //read the api key from local storage
  useEffect(() => {
    const keys = localStorage.getItem('apiKeyMap');
    console.log('keys', keys);
    if (keys) {
      const keyMapObj = JSON.parse(keys);
      console.log('keyMapObj', keyMapObj);
      for (const [key, value] of Object.entries(keyMapObj)) {
        console.log('key', key, 'value', value);  
        keyMap.set(key, value);
        console.log('keyMap', keyMap);
      }
    }
    console.log('model', model);
    if (keyMap.has(model)) {
      console.log('setApiKey', keyMap.get(model));
      setApiKey(keyMap.get(model));
    }
  }, [model]);

  const [openDialog, setOpenDialog] = useState(false);
  const handleOpenChange = (value: boolean) => {
    setOpenDialog(value);
  }

  //Prompt selection
  const [prompt, setPrompt] = useState('Auto');
  
  // Create a reference to the worker object.
  const worker = useRef(null);
  //When user enter text in the textarea, update the result
  const handleTextChange = (text: string) => {
    console.log("handleTextChange", text)
    setResult(text)
  }
  const handleModelChange = (value: string) => {
    console.log('handleModelChange', value);
    setModel(value);
    //read the api key for new model from local storage
    if (keyMap.has(value)) {
      setApiKey(keyMap.get(value));
      isApiKeyEmpty();
    }
  }
  //handle api key change
  const handleApiKeyChange = (value: string) => {
    console.log('handleApiKeyChange', value);
    keyMap.set(model, value);
    setApiKey(value);
    //save the api key to local storage
    localStorage.setItem('apiKeyMap', JSON.stringify(Object.fromEntries(keyMap)));
    //close the dialog
    setOpenDialog(false);
  }
  //check if api key is empty
  const isApiKeyEmpty = () => {
    if (apiKey === '') {
      setOpenDialog(true);
    }
  }

  //handle prompt change
  const handlePromptChange = (value: string) => {
    console.log('handlePromptChange', value);
    setPrompt(value);
    if(screenShotResult === null) {
      return;
    } else {
    setResult(null);
    setLoading(true);
    aiModels.create(model).then((model: aiModels) => {
      const fullPrompt = promptOptions.find((p) => p.value === value).prompt;
      return model.run(screenShotResult,fullPrompt);
    }).then((res: string) => {
      console.log('model res', res);
      setResult(res);
      setLoading(false);
    }).catch((error: any) => {
      console.log('model error', error);
      setLoading(false);
    });
    }
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
      aiModels.create(model).then((modelInstance: aiModels) => {
        const fullPrompt = promptOptions[model as keyof typeof promptOptions].find((p) => p.value === prompt).prompt;
        if (models.find((m) => m.value === model)?.requireApiKey) {
          return modelInstance.run(value, fullPrompt, apiKey);
        }
        return modelInstance.run(value, fullPrompt);
      }).then((res: string) => {
        console.log('model res', res);
        setLoading(false);
        setResult(res);
      }).catch((error: any) => {
        console.log('model error', error);
        setLoading(false);
      });
      // gemini(value).then((res) => {
      //   console.log('gemini res', res);
      //   setLoading(false);
      //   setResult(res);
      // });
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
        {screenShotResult && <div className='pt-[2.5rem]'>
          <Badge variant="secondary"
        className='mb-2 antialiased font-medium'
        >
          <ImageIcon className="w-5 h-5 mr-1" />
          Screenshot</Badge> </div>}
        <div className='max-w-[90%]'>
        {screenShotResult && <img src={`data:image/png;base64,${screenShotResult}`} alt="screenshot" className="mb-2 rounded-lg object-center border border-gray-100 dark:border-gray-800 mx-auto" />}

      <div className="flex space-x-2 mb-2 justify-center">
      <PromptSelect handlePromptChange={handlePromptChange} model={model}/>
      {/*only show the api key button when the model is gpt4 */}
      {
      models.find((m) => m.value === model)?.requireApiKey
       &&
      <ApiKeyButton onClick={()=>setOpenDialog(true)} />}
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
      </div>
      </header>
      
     <ApiKeyInput apikey={apiKey} onKeySave={handleApiKeyChange} open={openDialog} onOpenChange={handleOpenChange} model={model} />

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


export function ApiKeyButton(props: { onClick: () => void }) {
  return (
    <Button variant="outline" size="icon" className="mt-auto" onClick={props.onClick}>
      <KeyRound className="h-10 w-5" />
    </Button>
  )
}

export default App;