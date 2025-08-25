import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, Loader, Environment, useFBX, useAnimations, OrthographicCamera } from '@react-three/drei';
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial';

import { LinearEncoding, sRGBEncoding } from 'three/src/constants';
import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from 'three';

import { OrbitControls } from '@react-three/drei';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import createAnimation from './converter';
import blinkData from './blendDataBlink.json';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Access your API key (see "Set up your API key" above)
import './App.css'

import * as THREE from 'three';
import axios from 'axios';
const _ = require('lodash');

// Ollama configuration
const OLLAMA_HOST = 'http://localhost:11434';
// Text-to-Speech utility functions
const textToSpeech = (text, onStart, onEnd, onBoundary = null) => {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported');
    onEnd();
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Function to set voice after voices are loaded
  const setVoice = () => {
    try {
      const voices = window.speechSynthesis.getVoices();
      
      // Look for American English female voices first
      const americanFemaleVoice = voices.find(voice => 
        (voice.lang === 'en-US' || voice.lang.startsWith('en-US')) &&
        (voice.name.toLowerCase().includes('female') ||
         voice.name.toLowerCase().includes('zira') ||
         voice.name.toLowerCase().includes('cortana') ||
         voice.name.toLowerCase().includes('woman') ||
         (voice.gender && voice.gender.toLowerCase() === 'female'))
      );
      
      // Fallback to any American English voice
      const americanVoice = voices.find(voice => 
        voice.lang === 'en-US' || voice.lang.startsWith('en-US')
      );
      
      // Further fallback to any female voice
      const anyFemaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman') ||
        (voice.gender && voice.gender.toLowerCase() === 'female')
      );
      
      // Final fallback to any English voice
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
      
      const selectedVoice = americanFemaleVoice || americanVoice || anyFemaleVoice || englishVoice;
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name, '(', selectedVoice.lang, ')');
      } else {
        console.log('No suitable voice found, using default');
      }
    } catch (error) {
      console.warn('Error setting voice:', error);
    }
  };

  // Set voice immediately if voices are already loaded
  if (window.speechSynthesis.getVoices().length > 0) {
    setVoice();
  } else {
    // Wait for voices to load
    const handleVoicesChanged = () => {
      setVoice();
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
  }

  utterance.rate = 0.95;  // Slightly faster for more natural American speech
  utterance.pitch = 1.0;  // More neutral pitch
  utterance.volume = 0.8;

  utterance.onstart = () => {
    console.log('Speech started');
    if (onStart) onStart();
  };
  
  utterance.onend = () => {
    console.log('Speech ended');
    if (onEnd) onEnd();
  };
  
  // Add boundary event for word-level synchronization
  utterance.onboundary = (event) => {
    if (onBoundary && event.name === 'word') {
      onBoundary(event);
    }
  };
  
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    if (onEnd) onEnd();
  };

  // Small delay to ensure voice is set
  setTimeout(() => {
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error starting speech synthesis:', error);
      if (onEnd) onEnd();
    }
  }, 100);
};

// Ollama API function
const getOllamaResponse = async (message) => {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: "llama3.2", // You can change this to your preferred model
      prompt: `You are Joi, a friendly 3D virtual assistant. Keep responses conversational and under 50 words. User says: ${message}`,
      stream: false
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Ollama error:', error);
    throw new Error('Failed to get response from Ollama. Make sure Ollama is running locally.');
  }
};

function Avatar({ avatar_url, speak, setSpeak, text, setAudioSource, playing, setPlaying }) {

  let gltf = useGLTF(avatar_url);
  let morphTargetDictionaryBody = null;
  let morphTargetDictionaryLowerTeeth = null;

  const [speechIntensity, setSpeechIntensity] = useState(0);
  const [wordBoundaries, setWordBoundaries] = useState([]);

  const [
    bodyTexture,
    eyesTexture,
    teethTexture,
    bodySpecularTexture,
    bodyRoughnessTexture,
    bodyNormalTexture,
    teethNormalTexture,
    // teethSpecularTexture,
    hairTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture,
  ] = useTexture([
    "/images/body.webp",
    "/images/eyes.webp",
    "/images/teeth_diffuse.webp",
    "/images/body_specular.webp",
    "/images/body_roughness.webp",
    "/images/body_normal.webp",
    "/images/teeth_normal.webp",
    // "/images/teeth_specular.webp",
    "/images/h_color.webp",
    "/images/tshirt_diffuse.webp",
    "/images/tshirt_normal.webp",
    "/images/tshirt_roughness.webp",
    "/images/h_alpha.webp",
    "/images/h_normal.webp",
    "/images/h_roughness.webp",
  ]);

  _.each([
    bodyTexture,
    eyesTexture,
    teethTexture,
    teethNormalTexture,
    bodySpecularTexture,
    bodyRoughnessTexture,
    bodyNormalTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture
  ], t => {
    t.encoding = sRGBEncoding;
    t.flipY = false;
  });

  bodyNormalTexture.encoding = LinearEncoding;
  tshirtNormalTexture.encoding = LinearEncoding;
  teethNormalTexture.encoding = LinearEncoding;
  hairNormalTexture.encoding = LinearEncoding;


  gltf.scene.traverse(node => {


    if (node.type === 'Mesh' || node.type === 'LineSegments' || node.type === 'SkinnedMesh') {

      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;


      if (node.name.includes("Body")) {

        node.castShadow = true;
        node.receiveShadow = true;

        node.material = new MeshPhysicalMaterial();
        node.material.map = bodyTexture;
        // node.material.shininess = 60;
        node.material.roughness = 1.7;

        // node.material.specularMap = bodySpecularTexture;
        node.material.roughnessMap = bodyRoughnessTexture;
        node.material.normalMap = bodyNormalTexture;
        node.material.normalScale = new Vector2(0.6, 0.6);

        morphTargetDictionaryBody = node.morphTargetDictionary;

        node.material.envMapIntensity = 0.8;
        // node.material.visible = false;

      }

      if (node.name.includes("Eyes")) {
        node.material = new MeshStandardMaterial();
        node.material.map = eyesTexture;
        // node.material.shininess = 100;
        node.material.roughness = 0.1;
        node.material.envMapIntensity = 0.5;


      }

      if (node.name.includes("Brows")) {
        node.material = new LineBasicMaterial({ color: 0x000000 });
        node.material.linewidth = 1;
        node.material.opacity = 0.5;
        node.material.transparent = true;
        node.visible = false;
      }

      if (node.name.includes("Teeth")) {

        node.receiveShadow = true;
        node.castShadow = true;
        node.material = new MeshStandardMaterial();
        node.material.roughness = 0.1;
        node.material.map = teethTexture;
        node.material.normalMap = teethNormalTexture;

        node.material.envMapIntensity = 0.7;


      }

      if (node.name.includes("Hair")) {
        node.material = new MeshStandardMaterial();
        node.material.map = hairTexture;
        node.material.alphaMap = hairAlphaTexture;
        node.material.normalMap = hairNormalTexture;
        node.material.roughnessMap = hairRoughnessTexture;

        node.material.transparent = true;
        node.material.depthWrite = false;
        node.material.side = 2;
        node.material.color.setHex(0x000000);

        node.material.envMapIntensity = 0.3;


      }

      if (node.name.includes("TSHIRT")) {
        node.material = new MeshStandardMaterial();

        node.material.map = tshirtDiffuseTexture;
        node.material.roughnessMap = tshirtRoughnessTexture;
        node.material.normalMap = tshirtNormalTexture;
        node.material.color.setHex(0xffffff);

        node.material.envMapIntensity = 0.5;


      }

      if (node.name.includes("TeethLower")) {
        morphTargetDictionaryLowerTeeth = node.morphTargetDictionary;
      }

    }

  });

  const [clips, setClips] = useState([]);

  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), []);

  useEffect(() => {

    if (speak === false)
      return;

    // Use browser text-to-speech instead of remote server
    textToSpeech(
      text,
      () => {
        // On speech start
        setPlaying(true);
        setAudioSource('browser-tts'); // Just a flag to indicate TTS is active
        setSpeechIntensity(1);
      },
      () => {
        // On speech end
        setSpeak(false);
        setPlaying(false);
        setAudioSource(null);
        setSpeechIntensity(0);
      },
      (event) => {
        // On word boundary - increase mouth movement intensity
        setSpeechIntensity(Math.random() * 0.5 + 0.5); // Random intensity between 0.5 and 1
        setWordBoundaries(prev => [...prev, { time: Date.now(), charIndex: event.charIndex }]);
      }
    );

    // Create simple mouth movement animation for TTS
    const createSimpleTalkingAnimation = () => {
      if (!morphTargetDictionaryBody) return null;

      const duration = Math.max(3, text.length * 0.12); // Longer duration for more mouth movement
      const frameRate = 30;
      const frames = Math.floor(duration * frameRate);
      
      const animationData = [];
      
      for (let i = 0; i <= frames; i++) {
        const time = i / frameRate;
        const progress = i / frames;
        
        // More varied and dynamic mouth movements
        const primaryWave = Math.sin(progress * Math.PI * 8) * 0.35; // Increased amplitude
        const secondaryWave = Math.sin(progress * Math.PI * 15) * 0.15; // Faster secondary movement
        const tertiaryWave = Math.sin(progress * Math.PI * 25) * 0.08; // Even faster micro-movements
        
        // Add some randomness for natural variation
        const randomFactor = (Math.random() - 0.5) * 0.1;
        
        // Combine waves for more complex movement with speech intensity
        const intensityMultiplier = speechIntensity || 0.7; // Use real-time intensity or default
        const jawOpen = Math.max(0.05, Math.min(0.6, 
          (0.2 + primaryWave + secondaryWave + tertiaryWave + randomFactor) * intensityMultiplier
        ));
        
        const mouthOpen = jawOpen * 0.7;
        
        // More dynamic secondary movements
        const mouthPucker = Math.sin(progress * Math.PI * 6) * 0.08;
        const mouthShrugUpper = Math.sin(progress * Math.PI * 4.5) * 0.05;
        const mouthFrown = Math.sin(progress * Math.PI * 3.2) * 0.03;
        
        // Add some lip corner movement for more realism
        const mouthSmileLeft = Math.sin(progress * Math.PI * 7.3) * 0.04;
        const mouthSmileRight = Math.sin(progress * Math.PI * 7.7) * 0.04;
        
        animationData.push({
          blendshapes: {
            jawOpen: jawOpen,
            mouthOpen: mouthOpen,
            mouthPucker: Math.max(0, mouthPucker),
            mouthShrugUpper: Math.max(0, mouthShrugUpper),
            mouthFrownLeft: Math.max(0, mouthFrown),
            mouthFrownRight: Math.max(0, mouthFrown * 0.9),
            mouthSmileLeft: Math.max(0, mouthSmileLeft),
            mouthSmileRight: Math.max(0, mouthSmileRight),
            // Add some subtle eye movement for more lifelike appearance
            eyeBlinkLeft: progress > 0.3 && progress < 0.35 ? 0.8 : 0,
            eyeBlinkRight: progress > 0.3 && progress < 0.35 ? 0.8 : 0,
          }
        });
      }

      return animationData;
    };

    const simpleTalkingData = createSimpleTalkingAnimation();
    
    if (simpleTalkingData && morphTargetDictionaryBody) {
      const newClips = [
        createAnimation(simpleTalkingData, morphTargetDictionaryBody, 'HG_Body')
      ];

      // Add teeth animation if available
      if (morphTargetDictionaryLowerTeeth) {
        newClips.push(createAnimation(simpleTalkingData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower'));
      }

      setClips(newClips.filter(clip => clip !== null));
    }

  }, [speak, text]);

  let idleFbx = useFBX('/idle.fbx');
  let { clips: idleClips } = useAnimations(idleFbx.animations);

  idleClips[0].tracks = _.filter(idleClips[0].tracks, track => {
    return track.name.includes("Head") || track.name.includes("Neck") || track.name.includes("Spine2");
  });

  idleClips[0].tracks = _.map(idleClips[0].tracks, track => {

    if (track.name.includes("Head")) {
      track.name = "head.quaternion";
    }

    if (track.name.includes("Neck")) {
      track.name = "neck.quaternion";
    }

    if (track.name.includes("Spine")) {
      track.name = "spine2.quaternion";
    }

    return track;

  });

  useEffect(() => {

    let idleClipAction = mixer.clipAction(idleClips[0]);
    idleClipAction.play();

    let blinkClip = createAnimation(blinkData, morphTargetDictionaryBody, 'HG_Body');
    let blinkAction = mixer.clipAction(blinkClip);
    blinkAction.play();


  }, []);

  // Play animation clips when available
  useEffect(() => {

    if (playing === false)
      return;

    _.each(clips, clip => {
      let clipAction = mixer.clipAction(clip);
      clipAction.setLoop(THREE.LoopOnce);
      clipAction.play();

    });

  }, [playing]);


  useFrame((state, delta) => {
    mixer.update(delta);
  });

  return (
    <group name="avatar">
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}

const STYLES = {
  area: { position: 'absolute', bottom: '0', left: '0', zIndex: 500 },
  speak: { padding: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None' },
  label: { color: '#777777', fontSize: '0.5em' },
}

function App() {

  const [chats, setChats] = useState([{ msg: 'Hi there! I\'m Joi, your AI assistant. I\'m now powered by local Ollama and speak with a natural voice!', who: 'bot', exct: '0' }])
  const [text, setText] = useState("Hello I am Joi, your 3D virtual assistant. I'm now powered by local Ollama and use browser text-to-speech!");
  const [msg, setMsg] = useState("");
  const [exct, setexct] = useState("");
  const [load, setLoad] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [visits, setVisits] = useState("--");
  const getResposnse = async (msg) => {
    if (msg === '') {
      toast.error("Prompt can't be empty.[In some browsers mic may not work]");
      return;
    }
    if (load === true || speak === true) {
      toast.error("Already generating response!");
      return;
    }
    setChats(chats => [...chats, { msg: msg, who: 'me' }])

    setMsg("");
    setLoad(true);
    
    try {
      const start = new Date();
      
      // Use Ollama instead of Google Generative AI
      const response = await getOllamaResponse(msg);
      
      const timeTaken = (new Date()) - start;
      
      setSpeak(true);
      setText(response);
      setexct(timeTaken / 1000);
      setLoad(false);
      
    } catch (error) {
      console.error('Error getting response:', error);
      toast.error(error.message || "Failed to get response. Make sure Ollama is running.");
      setLoad(false);
    }
  }

  const getWebsiteVisits = async () => {
    const url = 'https://counter10.p.rapidapi.com/?ID=prompt3&COLOR=red&CLABEL=blue';
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': 'ede3c5163fmsh01abdacf07fd2b0p1c0e4bjsn1db1b15be576',
        'X-RapidAPI-Host': 'counter10.p.rapidapi.com'
      }
    };
    try {
      const response = await fetch(url, options);
      const result = await response.text();
      console.log(result);

      setVisits(JSON.parse(result).message)
    } catch (error) {
      console.error(error);
    }
  }
  useEffect(() => {
    getWebsiteVisits();
  }, [])
  useEffect(() => {
    document.querySelector('.chat-box').scrollTop = document.querySelector('.chat-box').scrollHeight;
  }, [chats])

  const [speak, setSpeak] = useState(false);
  const [audioSource, setAudioSource] = useState(null);
  const [playing, setPlaying] = useState(false);
  
  // Handle TTS completion
  useEffect(() => {
    if (playing && text && exct) {
      // Add the bot response to chat when TTS starts
      setChats(chats => [...chats, { msg: text, who: 'bot', exct: exct }]);
    }
  }, [playing, text, exct]);
  const [isListening, setIsListening] = useState(false);
  const [listeningTimeout, setListeningTimeout] = useState(null);
  
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  
  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      toast.error("Voice recognition not supported by browser.");
      return;
    }
    
    if (load === true || speak === true) {
      toast.error("Please wait for current operation to complete.");
      return;
    }

    // Clear any existing transcript and input
    resetTranscript();
    setMsg("");
    setIsListening(true);
    
    SpeechRecognition.startListening({
      continuous: true,
      language: 'en-US',
      interimResults: true
    });
    
    // Set timeout to automatically stop listening after 30 seconds
    const timeout = setTimeout(() => {
      if (isListening) {
        stopListening();
        toast.info("Listening timeout - please try again.");
      }
    }, 30000);
    
    setListeningTimeout(timeout);
  };
  
  const stopListening = () => {
    setIsListening(false);
    SpeechRecognition.stopListening();
    
    // Clear timeout
    if (listeningTimeout) {
      clearTimeout(listeningTimeout);
      setListeningTimeout(null);
    }
    
    // Only send message if we have meaningful content
    const finalTranscript = transcript.trim();
    if (finalTranscript && finalTranscript.length > 2) {
      getResposnse(finalTranscript);
    } else if (finalTranscript) {
      setMsg(finalTranscript); // Set in input field for user to edit
    }
  };
  
  const cancelListening = () => {
    setIsListening(false);
    SpeechRecognition.stopListening();
    
    // Clear timeout
    if (listeningTimeout) {
      clearTimeout(listeningTimeout);
      setListeningTimeout(null);
    }
    
    resetTranscript();
    setMsg("");
  };

  useEffect(() => {
    if (isListening) {
      setMsg(transcript);
    }
  }, [transcript, isListening]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
      }
    };
  }, [listeningTimeout]);

  return (
    <div className="full">
      <ToastContainer
        position="top-left"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div style={STYLES.area}>
        <button style={STYLES.speak}>
          {speak || load ? 'Running...' : 'Type message.'}
        </button>
      </div>
      <div className='about' onClick={() => { setShowModal(!showModal) }}>
        <img src='./images/icons/menu.png' alt='menu'></img>
      </div>
      <div className='modal' style={{ display: showModal ? 'flex' : 'none' }}>
        <h1>Promt 3D</h1>
        <p style={{ marginTop: '10px' }}>A ThreeJS-powered virtual human that uses local Ollama and browser text-to-speech for natural conversation</p>
        <a style={{ padding: '10px' }} className='repo' href='https://github.com/vaibhav1663/promt3d' target='_blank'>Github</a>
        <p>Make sure Ollama is running locally on port 11434</p>
        <p>Made with ❤️ by</p>
        <a href='https://vaibhav1663.github.io/' target='_blank' style={{ marginBlock: "5px" }}>Vaibhav Khating</a>
        <p>Visitor's count 👀 : <span style={{color: '#35a4f3'}}>{visits}</span></p>
      </div>
      <div className='chat-div'>
        <div className='chat-box'>
          {chats.map((chat, index) => {
            const uniqueKey = `${chat.who}-${index}-${chat.msg.substring(0, 20)}`;
            if (chat.who === "me") {
              return <div key={uniqueKey} className={chat.who}>
                {chat.msg}
              </div>
            } else {
              return <div key={uniqueKey} className={chat.who}>
                {chat.msg}
                <div className='time'>{"generated in " + chat.exct + "s"}</div>
              </div>
            }
          })}

          {(load === true || speak) && !playing ? <div style={{ padding: '5px', display: 'flex', alignItems: 'center' }}><lottie-player src="https://lottie.host/8891318b-7fd9-471d-a9f4-e1358fd65cd6/EQt3MHyLWk.json" style={{ width: "50px", height: "50px" }} loop autoplay speed="1.4" direction="1" mode="normal"></lottie-player></div> : <></>}
          
          {isListening && <div style={{ padding: '5px', display: 'flex', alignItems: 'center', color: '#ff4444' }}>
            🎤 Listening... <span style={{ marginLeft: '10px', cursor: 'pointer', color: '#35a4f3' }} onClick={cancelListening}>Cancel</span>
          </div>}
        </div>
        <div className='msg-box'>
          <button 
            className={`msgbtn ${isListening ? 'listening' : ''}`} 
            id='mic' 
            onMouseDown={isListening ? stopListening : startListening}
            onTouchStart={isListening ? stopListening : startListening}
            style={{
              backgroundColor: isListening ? '#ff4444' : '',
              transform: isListening ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}
          >
            <img src='./images/icons/mic.png' alt='mic' unselectable='on'></img>
          </button>
          <input 
            type='text' 
            value={msg} 
            onChange={e => setMsg(e.target.value)} 
            onKeyDown={(e) => { 
              if (e.key === 'Enter') { 
                if (isListening) {
                  stopListening();
                } else {
                  getResposnse(msg);
                } 
              } 
            }} 
            placeholder={isListening ? 'Listening...' : 'Say Hello!'}
            style={{
              backgroundColor: isListening ? '#ffe6e6' : '',
              color: isListening ? '#333' : ''
            }}
          ></input>
          <button className='msgbtn' id='send' onClick={() => { 
            if (isListening) {
              stopListening();
            } else {
              getResposnse(msg);
            }
          }}>
            <img src='./images/icons/send.png' alt='send'></img>
          </button>
        </div>
      </div>

      {/* <Stats /> */}
      <Canvas dpr={2} onCreated={(ctx) => {
        ctx.gl.physicallyCorrectLights = true;
      }}>

        <OrthographicCamera
          makeDefault
          zoom={1400}
          position={[0, 1.65, 1]}
        />

        {/* <OrbitControls
        target={[0, 1.65, 0]}
      /> */}

        <Suspense fallback={null}>
          <Environment background={false} files="/images/photo_studio_loft_hall_1k.hdr" />
        </Suspense>

        <Suspense fallback={null}>
          <Bg />
        </Suspense>

        <Suspense fallback={null}>
          <Avatar
            avatar_url="/model.glb"
            speak={speak}
            setSpeak={setSpeak}
            text={text}
            setAudioSource={setAudioSource}
            playing={playing}
            setPlaying={setPlaying}
          />
        </Suspense>
      </Canvas>
      <Loader dataInterpolation={(p) => `Loading... please wait`} />
    </div>
  )
}

function Bg() {

  const texture = useTexture('/images/background.jpg');

  return (
    <mesh position={[0, 1.5, -4]} scale={[1.2, 1.2, 1.2]}>
      <planeBufferGeometry />
      <meshBasicMaterial map={texture} />

    </mesh>
  )

}

export default App;
