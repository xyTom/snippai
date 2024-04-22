
import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import aiModels from './models';
//disable the eslint warning for the import of the logo
// eslint-disable-next-line
import logo from './assets/logo.png';
import DisplayTextResult from './components/displayTextResult';
import LoadingSkeleton from './components/loadingSkeleton';
import { Badge } from "./components/ui/badge"
import ModelSelect from './components/modelSelect';
import ApiKeyInput from './components/apiKeyInput';
import PromptSelect from './components/promptSelect';
import { KeyRound, RotateCw, Trash2 } from "lucide-react"
import { Button } from "./components/ui/button"
import { promptOptions, models } from './lib/models';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip"
import { useToast } from "./components/ui/use-toast"
import { Toaster } from "./components/ui/toaster"
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import DisplayLatex  from './components/displayLatex';

declare global {
  interface Window {
    electronAPI: any;
  }
}



function App() {
  const [screenShotResult, setscreenShotResult] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  //retry button
  const [onError, setOnError] = useState(false);

  //Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  //notification
  const { toast } = useToast()

  //MathJax Config
  const config = {
    loader: { load: ["[tex]/html"] },
    tex: {
      packages: { "[+]": ["html"] },
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"]
      ],
      displayMath: [
        ["$$", "$$"],
        ["\\[", "\\]"],
        ["```latex", "```"],
      ]
    }
  };

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
    if (value === model || !value) {
      return;
    }
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
  //recoginze the screenshot and generate the result
  const recoginzeScreenshot = (value: string) => {
    setResult(null);
    setOnError(false);
    setLoading(true);
    aiModels.create(model).then((modelInstance: aiModels) => {
      console.log('prompt', prompt);
      const fullPrompt = promptOptions[model as keyof typeof promptOptions].find((p) => p.value === prompt).prompt;
      console.log('fullPrompt', fullPrompt);
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
      setOnError(true);
      toast({
        title: "Uh oh! Something went wrong.",
        description: `Please try again later. Error Message: ${error.message}`,
        
      });

    });
  }
  //handle prompt change
  const handlePromptChange = (value: string) => {
    console.log('handlePromptChange', value);
    setPrompt(value);
  }
  useEffect(() => {
    if (screenShotResult !== null) {
      recoginzeScreenshot(screenShotResult);
    }
  }, [prompt, screenShotResult]);
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
    const onMessageReceived = (e: any) => {
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
    } else {
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
    
    <div className="App dark select-none">

      <header className="App-header relative">
        <div className="flex	h-8 px-4 md:px-6 w-full shrink-0 absolute top-[0.5rem] right-0">
          <div className="hidden sm:flex" >
            <span className="sr-only">Snippai</span>
          </div>
          <div className="ml-auto space-x-4 flex text-white select-none">
            <ModelSelect handleModelChange={handleModelChange} />
          </div>
        </div>
        {/* <!-- if no screenshot result, show the logo --> */}
        {!screenShotResult && <img src={logo} className="App-logo select-none" alt="logo" />}
        {!screenShotResult && <p className="mb-2 select-none">
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
            <PromptSelect handlePromptChange={handlePromptChange} model={model} />

            {/* When there is result or onError, show the retry button */}
            {(result)
            && <RetryButton onClick={() => recoginzeScreenshot(screenShotResult)} />}
            {(onError)
            && <RetryButton onClick={() => recoginzeScreenshot(screenShotResult)} />}
            {result && <TrashButton onClick={() => {setscreenShotResult(null); setResult(null); setOnError(false)}} />}
            {/*only show the api key button when the model is gpt4 */}
            {
              models.find((m) => m.value === model)?.requireApiKey
              &&
              <ApiKeyButton onClick={() => setOpenDialog(true)} />}
          </div>
          {/* {result && <button onClick={() => {
        navigator.clipboard.writeText(result)
      }
      }>Copy</button>} */}
          {loading && <LoadingSkeleton />}

          <MathJaxContext version={3} config={config}>
          {(result && prompt=="Formula" ) && <DisplayLatex latex={result} />}
          </MathJaxContext>
          {result &&
            <DisplayTextResult text={result} onTextChange={handleTextChange} />
          }

        </div>
      </header>

      <ApiKeyInput apikey={apiKey} onKeySave={handleApiKeyChange} open={openDialog} onOpenChange={handleOpenChange} model={model} />
      <Toaster />
    </div>
  );
}
function ImageIcon(props: React.SVGProps<SVGSVGElement>) {
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

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="mt-auto" onClick={props.onClick}>
            <KeyRound className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit API Key</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function RetryButton(props: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" onClick={props.onClick}>
            <RotateCw className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Retry</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

  )
}

export function TrashButton(props: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="destructive" size="icon" onClick={props.onClick}>
            <Trash2 className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear Screenshot</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default App;
