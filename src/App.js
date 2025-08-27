import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, Loader, Environment, useFBX, useAnimations, OrthographicCamera } from '@react-three/drei';
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial';

import { LinearEncoding, sRGBEncoding } from 'three/src/constants';
import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from 'three';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import createAnimation from './converter';
import blinkData from './blendDataBlink.json';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Import RAG service for Michael's knowledge
import ragService from './rag/rag-service.js';

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
    if (onEnd) onEnd();
    return;
  }

  // Cancel any ongoing speech to prevent overlap
  window.speechSynthesis.cancel();

  // Remove emotion markers from speech but keep the text for emotion detection
  const cleanText = text.replace(/\*[^*]+\*/g, '').trim();
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
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
      };  utterance.onerror = (event) => {
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

// Enhanced Ollama API function with RAG integration
const getOllamaResponse = async (message) => {
  try {
    // First, check if the query is about Michael using RAG
    const ragResults = ragService.processQuery(message);
    let contextualInfo = "";
    let isAboutMichael = false;

    // Determine if this is a question about Michael
    const michaelKeywords = ['michael', 'you', 'your', 'skills', 'experience', 'projects', 'certifications', 'background', 'work', 'technologies', 'about yourself'];
    isAboutMichael = michaelKeywords.some(keyword => message.toLowerCase().includes(keyword));

    if (isAboutMichael && ragResults && ragResults.length > 0) {
      // Use RAG results to provide context
      contextualInfo = ragResults.slice(0, 3).map(r => r.content).join(' ');
      
      // For questions specifically about Michael, provide direct RAG response
      if (message.toLowerCase().includes('who are you') || 
          message.toLowerCase().includes('about yourself') ||
          message.toLowerCase().includes('tell me about michael')) {
        return ragService.generateContextualResponse(message, ragResults);
      }
    }

    // Enhanced prompt with RAG context
    let enhancedPrompt = `You are Joi, Michael McCullough's AI assistant. You represent Michael, a Senior AI Engineer & Software Architect. Important: Always refer to him as "Michael" or "Michael McCullough" - never use "Mike" or any other nicknames. 

You have facial expressions and can show emotions through physical expressions. You can use emotion markers like *smile*, *thinking*, *surprised*, *confident*, *wave* etc. in your responses - these will trigger actual facial expressions and will NOT be spoken aloud.

Be conversational and expressive. Use emotion markers when appropriate to enhance your responses with visual expressions.`;
    
    if (contextualInfo) {
      enhancedPrompt += ` Here's relevant information about Michael: ${contextualInfo}`;
    }
    
    enhancedPrompt += ` Keep responses conversational and under 50 words, but be expressive and engaging. User says: ${message}`;

    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: "llama3.2",
      prompt: enhancedPrompt,
      stream: false
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Ollama error:', error);
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Make sure Ollama is running on localhost:11434');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Ollama host not found. Check your network connection.');
    } else if (error.response) {
      throw new Error(`Ollama server error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      throw new Error('Failed to get response from Ollama. Make sure Ollama is running locally.');
    }
  }
};

function Avatar({ avatar_url, speak, setSpeak, text, playing, setPlaying, isPlayingAudio, setIsPlayingAudio, load }) {

  let gltf = useGLTF(avatar_url);
  let morphTargetDictionaryBody = null;
  let morphTargetDictionaryLowerTeeth = null;

  // Emotion detection and expression system
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isExpressing, setIsExpressing] = useState(false);

  // Find the main face mesh for expressions
  let faceMesh = null;
  if (gltf.scene) {
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        faceMesh = child;
      }
    });
  }

  // Enhanced emotion detection function
  const detectEmotion = (responseText) => {
    if (!responseText) return 'neutral';
    
    const text = responseText.toLowerCase();
    
    // First check for explicit emotion markers
    if (text.match(/\*(.*smile.*|.*happy.*|.*joy.*|.*pleased.*|.*grin.*)\*/)) {
      return 'happy';
    }
    if (text.match(/\*(.*think.*|.*ponder.*|.*consider.*|.*concentrate.*)\*/)) {
      return 'thinking';
    }
    if (text.match(/\*(.*surprise.*|.*wow.*|.*amaze.*|.*shock.*)\*/)) {
      return 'surprised';
    }
    if (text.match(/\*(.*concern.*|.*worry.*|.*serious.*|.*frown.*)\*/)) {
      return 'concerned';
    }
    if (text.match(/\*(.*confident.*|.*proud.*|.*smirk.*)\*/)) {
      return 'confident';
    }
    if (text.match(/\*(.*welcome.*|.*warm.*|.*friendly.*|.*greet.*)\*/)) {
      return 'friendly';
    }
    if (text.match(/\*(.*wave.*|.*hello.*|.*hi.*|.*goodbye.*|.*bye.*)\*/)) {
      return 'wave';
    }
    
    // Then check for contextual emotions in regular text
    if (text.match(/(great|excellent|wonderful|amazing|fantastic|love|excited|happy|glad|pleased|perfect|awesome|brilliant)/)) {
      return 'happy';
    }
    
    // Thinking/Concentrated
    if (text.match(/(think|consider|analyze|complex|technical|algorithm|data|programming|engineering|let me|hmm|well)/)) {
      return 'thinking';
    }
    
    // Surprised/Interested
    if (text.match(/(wow|interesting|fascinating|surprised|really|incredible|impressive|amazing)/)) {
      return 'surprised';
    }
    
    // Concerned/Serious
    if (text.match(/(concern|issue|problem|difficult|challenge|unfortunately|however|careful|important)/)) {
      return 'concerned';
    }
    
    // Confident/Professional
    if (text.match(/(expertise|experience|skilled|professional|accomplished|successful|leader|expert)/)) {
      return 'confident';
    }
    
    // Friendly/Welcoming
    if (text.match(/(hello|hi|welcome|nice|meet|help|assist|pleasure)/)) {
      return 'friendly';
    }
    
    return 'neutral';
  };

  // Expression mappings for each emotion
  const emotionExpressions = {
    happy: [
      { morph: 'mouthSmile_L', intensity: 0.6 },
      { morph: 'mouthSmile_R', intensity: 0.6 },
      { morph: 'cheekSquint_L', intensity: 0.3 },
      { morph: 'cheekSquint_R', intensity: 0.3 }
    ],
    thinking: [
      { morph: 'browDown_L', intensity: 0.4 },
      { morph: 'browDown_R', intensity: 0.4 },
      { morph: 'mouthPucker', intensity: 0.3 }
    ],
    surprised: [
      { morph: 'eyeWide_L', intensity: 0.7 },
      { morph: 'eyeWide_R', intensity: 0.7 },
      { morph: 'browInnerUp', intensity: 0.5 },
      { morph: 'jawOpen', intensity: 0.2 }
    ],
    concerned: [
      { morph: 'browDown_L', intensity: 0.5 },
      { morph: 'browDown_R', intensity: 0.5 },
      { morph: 'mouthFrown_L', intensity: 0.3 },
      { morph: 'mouthFrown_R', intensity: 0.3 }
    ],
    confident: [
      { morph: 'mouthSmile_L', intensity: 0.4 },
      { morph: 'mouthSmile_R', intensity: 0.4 },
      { morph: 'browOuterUp_L', intensity: 0.3 },
      { morph: 'browOuterUp_R', intensity: 0.3 }
    ],
    friendly: [
      { morph: 'mouthSmile_L', intensity: 0.5 },
      { morph: 'mouthSmile_R', intensity: 0.5 },
      { morph: 'eyeSquint_L', intensity: 0.2 },
      { morph: 'eyeSquint_R', intensity: 0.2 }
    ],
    wave: [
      { morph: 'mouthSmile_L', intensity: 0.6 },
      { morph: 'mouthSmile_R', intensity: 0.6 },
      { morph: 'eyeSquint_L', intensity: 0.3 },
      { morph: 'eyeSquint_R', intensity: 0.3 },
      { morph: 'browInnerUp', intensity: 0.2 }
    ],
    neutral: []
  };

  // Function to apply emotion expression
  const applyEmotion = (emotion, duration = 3000) => {
    if (!faceMesh || !faceMesh.morphTargetDictionary || isExpressing) return;
    
    setIsExpressing(true);
    console.log(`🎭 Applying emotion: ${emotion}`);
    
    const expressions = emotionExpressions[emotion] || [];
    const morphs = faceMesh.morphTargetDictionary;
    const influences = faceMesh.morphTargetInfluences;
    
    // Apply expressions
    expressions.forEach(({ morph, intensity }) => {
      if (morphs[morph] !== undefined) {
        influences[morphs[morph]] = intensity;
      }
    });
    
    // Hold expression, then fade out
    setTimeout(() => {
      expressions.forEach(({ morph }) => {
        if (morphs[morph] !== undefined) {
          // Gradual fade out
          const fadeOut = setInterval(() => {
            const currentValue = influences[morphs[morph]];
            if (currentValue > 0.05) {
              influences[morphs[morph]] = currentValue * 0.8;
            } else {
              influences[morphs[morph]] = 0;
              clearInterval(fadeOut);
            }
          }, 100);
        }
      });
      
      setTimeout(() => {
        setIsExpressing(false);
      }, 1000);
    }, duration);
  };

  // React to text changes (AI responses)
  useEffect(() => {
    if (text && text.length > 10) { // Only for substantial responses
      const detectedEmotion = detectEmotion(text);
      if (detectedEmotion !== currentEmotion) {
        setCurrentEmotion(detectedEmotion);
        applyEmotion(detectedEmotion);
      }
    }
  }, [text, currentEmotion, faceMesh, isExpressing]);

  // Debug: Log model capabilities
  useEffect(() => {
    if (gltf) {
      console.log('=== GLB MODEL DETAILED ANALYSIS ===');
      console.log('Full GLTF object:', gltf);
      
      // Check animations
      if (gltf.animations && gltf.animations.length > 0) {
        console.log('🎬 ANIMATIONS FOUND:', gltf.animations.length);
        gltf.animations.forEach((animation, index) => {
          console.log(`  Animation ${index}: "${animation.name}" - Duration: ${animation.duration}s`);
          console.log('    Tracks:', animation.tracks.map(track => ({
            name: track.name,
            type: track.constructor.name,
            times: track.times.length + ' keyframes'
          })));
        });
      } else {
        console.log('❌ No animations found');
      }
      
      // Detailed morph target analysis
      console.log('🔍 SCANNING ALL MESHES FOR MORPH TARGETS...');
      let totalMorphTargets = 0;
      
      gltf.scene.traverse((child) => {
        console.log(`Checking: ${child.name} (${child.type})`);
        
        if (child.isMesh) {
          console.log(`  � MESH: ${child.name}`);
          console.log(`    - Geometry: ${child.geometry ? 'YES' : 'NO'}`);
          console.log(`    - Material: ${child.material ? child.material.name || 'unnamed' : 'NO'}`);
          
          if (child.morphTargetDictionary) {
            const morphs = Object.keys(child.morphTargetDictionary);
            console.log(`    - 😊 MORPH TARGETS (${morphs.length}):`, morphs);
            totalMorphTargets += morphs.length;
            
            // Store for later use
            if (child.name.toLowerCase().includes('body') || child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('face')) {
              morphTargetDictionaryBody = child.morphTargetDictionary;
              console.log(`    - ✅ SET AS BODY MORPH DICTIONARY`);
            }
            if (child.name.toLowerCase().includes('teeth')) {
              morphTargetDictionaryLowerTeeth = child.morphTargetDictionary;
              console.log(`    - ✅ SET AS TEETH MORPH DICTIONARY`);
            }
          } else {
            console.log(`    - ❌ No morph targets`);
          }
        }
        
        if (child.isBone) {
          console.log(`  🦴 BONE: ${child.name}`);
        }
        
        if (child.isLight) {
          console.log(`  💡 LIGHT: ${child.name}`);
        }
        
        if (child.isCamera) {
          console.log(`  📷 CAMERA: ${child.name}`);
        }
      });
      
      console.log(`📊 SUMMARY:`);
      console.log(`  - Total morph targets found: ${totalMorphTargets}`);
      console.log(`  - Body morph dictionary set: ${morphTargetDictionaryBody ? 'YES' : 'NO'}`);
      console.log(`  - Teeth morph dictionary set: ${morphTargetDictionaryLowerTeeth ? 'YES' : 'NO'}`);
      
      console.log('=== END DETAILED ANALYSIS ===');
    }
  }, [gltf]);

  const [speechIntensity, setSpeechIntensity] = useState(0);
  
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

  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), [gltf.scene]);

  useEffect(() => {

    if (speak === false || isPlayingAudio === true)
      return;

    setIsPlayingAudio(true); // Set flag to prevent double playback

    // Use browser text-to-speech instead of remote server
    textToSpeech(
      text,
      () => {
        // On speech start
        setPlaying(true);
        // Remove audioSource usage since it's not needed
        setSpeechIntensity(1);
      },
      () => {
        // On speech end
        setSpeak(false);
        setPlaying(false);
        setSpeechIntensity(0);
        setIsPlayingAudio(false); // Clear flag when speech ends
      },
      (event) => {
        // On word boundary - increase mouth movement intensity
        setSpeechIntensity(Math.random() * 0.5 + 0.5); // Random intensity between 0.5 and 1
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

  }, [speak, text]); // Simplified dependencies - only react to speak and text changes

  // Reset audio flag when speak is turned off externally
  useEffect(() => {
    if (speak === false) {
      setIsPlayingAudio(false);
    }
  }, [speak]);

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


  }, [idleClips, mixer, morphTargetDictionaryBody]);

  // Enhanced idle behaviors with more expressions
  useEffect(() => {
    if (!faceMesh || !faceMesh.morphTargetDictionary) return;
    
    const morphs = faceMesh.morphTargetDictionary;
    const influences = faceMesh.morphTargetInfluences;
    let idleTimer;
    let blinkTimer;
    
    // Natural blinking
    const blink = () => {
      if (morphs['eyeBlink_L'] !== undefined && morphs['eyeBlink_R'] !== undefined) {
        influences[morphs['eyeBlink_L']] = 1;
        influences[morphs['eyeBlink_R']] = 1;
        setTimeout(() => {
          influences[morphs['eyeBlink_L']] = 0;
          influences[morphs['eyeBlink_R']] = 0;
        }, 150);
      }
      blinkTimer = setTimeout(blink, 2000 + Math.random() * 4000);
    };
    
    // Random idle expressions
    const idleExpression = () => {
      if (speak || load) {
        idleTimer = setTimeout(idleExpression, 3000);
        return;
      }
      
      // Random subtle expressions
      const expressions = [
        ['mouthSmile_L', 'mouthSmile_R'], // smile
        ['browInnerUp'], // surprised
        ['mouthPucker'], // thinking
        ['cheekSquint_L', 'cheekSquint_R'] // squint
      ];
      
      const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
      
      randomExpression.forEach(morphName => {
        if (morphs[morphName] !== undefined) {
          influences[morphs[morphName]] = 0.2 + Math.random() * 0.2;
        }
      });
      
      setTimeout(() => {
        randomExpression.forEach(morphName => {
          if (morphs[morphName] !== undefined) {
            influences[morphs[morphName]] = 0;
          }
        });
      }, 1500);
      
      idleTimer = setTimeout(idleExpression, 8000 + Math.random() * 12000);
    };
    
    blink();
    idleExpression();
    
    return () => {
      if (blinkTimer) clearTimeout(blinkTimer);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [faceMesh, speak, load]);

  // Add dynamic behaviors and life to the avatar
  useEffect(() => {
    if (!gltf.scene) return;

    let animationId;
    let blinkTimer;
    let gestureTimer;
    let expressionTimer;

    // Find the head/face mesh for expressions
    let faceMesh = null;
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        faceMesh = child;
      }
    });

    // Random blinking
    const randomBlink = () => {
      if (faceMesh && faceMesh.morphTargetDictionary) {
        const blinkMorphs = Object.keys(faceMesh.morphTargetDictionary).filter(key => 
          key.toLowerCase().includes('blink') || key.toLowerCase().includes('eye')
        );
        
        if (blinkMorphs.length > 0) {
          blinkMorphs.forEach(morphName => {
            const index = faceMesh.morphTargetDictionary[morphName];
            if (faceMesh.morphTargetInfluences) {
              // Quick blink animation
              faceMesh.morphTargetInfluences[index] = 1;
              setTimeout(() => {
                faceMesh.morphTargetInfluences[index] = 0;
              }, 150);
            }
          });
        }
      }
      
      // Schedule next blink randomly between 2-8 seconds
      blinkTimer = setTimeout(randomBlink, 2000 + Math.random() * 6000);
    };

    // Random subtle expressions
    const randomExpression = () => {
      if (faceMesh && faceMesh.morphTargetDictionary && !speak) {
        const expressionMorphs = Object.keys(faceMesh.morphTargetDictionary).filter(key => 
          key.toLowerCase().includes('smile') || 
          key.toLowerCase().includes('frown') ||
          key.toLowerCase().includes('brow') ||
          key.toLowerCase().includes('surprise')
        );
        
        if (expressionMorphs.length > 0) {
          const randomMorph = expressionMorphs[Math.floor(Math.random() * expressionMorphs.length)];
          const index = faceMesh.morphTargetDictionary[randomMorph];
          
          if (faceMesh.morphTargetInfluences) {
            // Subtle expression
            faceMesh.morphTargetInfluences[index] = 0.2 + Math.random() * 0.3;
            setTimeout(() => {
              faceMesh.morphTargetInfluences[index] = 0;
            }, 1500 + Math.random() * 2000);
          }
        }
      }
      
      // Schedule next expression randomly between 10-20 seconds
      expressionTimer = setTimeout(randomExpression, 10000 + Math.random() * 10000);
    };

    // Subtle head movements and breathing
    const breathingAnimation = () => {
      let time = 0;
      
      const animate = () => {
        time += 0.008; // Slower breathing
        
        // Find the main body/torso for breathing
        gltf.scene.traverse((child) => {
          // Very subtle chest movement
          if (child.name.toLowerCase().includes('spine') || 
              child.name.toLowerCase().includes('chest') || 
              child.name.toLowerCase().includes('torso')) {
            // Much more subtle breathing - barely noticeable
            const breathScale = 1 + Math.sin(time * 2) * 0.002;
            child.scale.y = breathScale;
          }
          
          // Minimal head movement
          if (child.name.toLowerCase().includes('head')) {
            // Very, very subtle head movement
            child.rotation.y = Math.sin(time * 0.3) * 0.005;
            child.rotation.x = Math.sin(time * 0.2) * 0.003;
          }
        });
        
        animationId = requestAnimationFrame(animate);
      };
      
      animate();
    };

    // Random subtle gestures
    const randomGesture = () => {
      gltf.scene.traverse((child) => {
        if (child.name.toLowerCase().includes('shoulder') || child.name.toLowerCase().includes('arm')) {
          // Subtle shoulder movement
          const originalY = child.rotation.y;
          child.rotation.y += (Math.random() - 0.5) * 0.1;
          
          setTimeout(() => {
            child.rotation.y = originalY;
          }, 2000);
        }
      });
      
      // Schedule next gesture randomly between 15-30 seconds
      gestureTimer = setTimeout(randomGesture, 15000 + Math.random() * 15000);
    };

    // Start all animations
    randomBlink();
    randomExpression();
    breathingAnimation();
    randomGesture();

    // Cleanup function
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (blinkTimer) clearTimeout(blinkTimer);
      if (gestureTimer) clearTimeout(gestureTimer);
      if (expressionTimer) clearTimeout(expressionTimer);
    };
  }, [gltf.scene, speak]);

  // Smooth lip sync animation with natural speech patterns
  useEffect(() => {
    let speakingAnimationId;
    let audioContext;
    let analyser;
    let dataArray;
    
    if (speak && faceMesh && faceMesh.morphTargetDictionary) {
      // Get mouth-related morph targets
      const mouthMorphs = {
        open: faceMesh.morphTargetDictionary['mouthOpen'] || faceMesh.morphTargetDictionary['jawOpen'],
        smile: faceMesh.morphTargetDictionary['mouthSmile_L'] || faceMesh.morphTargetDictionary['mouthSmile_R'],
        pucker: faceMesh.morphTargetDictionary['mouthPucker'] || faceMesh.morphTargetDictionary['lipsPucker'],
        wide: faceMesh.morphTargetDictionary['mouthStretch_L'] || faceMesh.morphTargetDictionary['mouthStretch_R'],
        close: faceMesh.morphTargetDictionary['mouthClose'] || faceMesh.morphTargetDictionary['lipsClose']
      };

      // Create smooth animation with natural speech patterns
      let time = 0;
      let lastVolume = 0;
      
      const animateLipSync = () => {
        time += 0.016; // 60fps
        
        // Create natural speech rhythm with multiple frequencies
        const baseFreq = Math.sin(time * 8) * 0.5 + 0.5; // Main speech frequency
        const midFreq = Math.sin(time * 12) * 0.3 + 0.3; // Consonant variations
        const highFreq = Math.sin(time * 16) * 0.2; // Fine details
        
        // Smooth volume changes
        const targetVolume = (baseFreq + midFreq) * 0.7;
        lastVolume = lastVolume * 0.85 + targetVolume * 0.15; // Smooth interpolation
        
        // Apply natural mouth movements based on speech patterns
        if (faceMesh.morphTargetInfluences) {
          // Main mouth opening based on volume
          if (mouthMorphs.open !== undefined) {
            faceMesh.morphTargetInfluences[mouthMorphs.open] = Math.max(0, lastVolume * 0.6);
          }
          
          // Subtle variations for realism
          if (mouthMorphs.wide !== undefined) {
            faceMesh.morphTargetInfluences[mouthMorphs.wide] = Math.max(0, (midFreq + highFreq) * 0.3);
          }
          
          // Lip compression for consonants
          if (mouthMorphs.pucker !== undefined) {
            faceMesh.morphTargetInfluences[mouthMorphs.pucker] = Math.max(0, Math.sin(time * 10) * 0.2 + 0.1);
          }
          
          // Subtle smile variations for natural expression
          if (mouthMorphs.smile !== undefined) {
            faceMesh.morphTargetInfluences[mouthMorphs.smile] = Math.max(0, Math.sin(time * 3) * 0.1 + 0.05);
          }
        }
        
        speakingAnimationId = requestAnimationFrame(animateLipSync);
      };
      
      animateLipSync();
    }
    
    return () => {
      if (speakingAnimationId) {
        cancelAnimationFrame(speakingAnimationId);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [speak, faceMesh]);

  // Thinking animation when AI is processing
  useEffect(() => {
    let thinkingInterval;
    
    if (load && faceMesh && faceMesh.morphTargetDictionary) {
      // Look for thinking/concentration expressions
      const thinkingMorphs = Object.keys(faceMesh.morphTargetDictionary).filter(key => 
        key.toLowerCase().includes('brow') || 
        key.toLowerCase().includes('frown') ||
        key.toLowerCase().includes('concentrate')
      );
      
      // Animate thinking expression
      thinkingInterval = setInterval(() => {
        thinkingMorphs.forEach(morphName => {
          const index = faceMesh.morphTargetDictionary[morphName];
          if (faceMesh.morphTargetInfluences) {
            faceMesh.morphTargetInfluences[index] = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
          }
        });
      }, 50);
    } else if (faceMesh && faceMesh.morphTargetDictionary) {
      // Reset thinking expressions when not loading
      Object.keys(faceMesh.morphTargetDictionary).forEach(morphName => {
        if (morphName.toLowerCase().includes('brow') || morphName.toLowerCase().includes('frown')) {
          const index = faceMesh.morphTargetDictionary[morphName];
          if (faceMesh.morphTargetInfluences) {
            faceMesh.morphTargetInfluences[index] = 0;
          }
        }
      });
    }
    
    return () => {
      if (thinkingInterval) clearInterval(thinkingInterval);
    };
  }, [load, faceMesh]);

  // Play animation clips when available
  useEffect(() => {

    if (playing === false)
      return;

    _.each(clips, clip => {
      let clipAction = mixer.clipAction(clip);
      clipAction.setLoop(THREE.LoopOnce);
      clipAction.play();

    });

  }, [playing, clips, mixer]);


  useFrame((state, delta) => {
    mixer.update(delta);
  });

  return (
    <group 
      name="avatar" 
      position={[0, 0, 0]} 
      scale={[1, 1, 1]} 
      rotation={[0, 0, 0]}
    >
      <primitive 
        object={gltf.scene} 
        dispose={null} 
        position={[0, 0, 0]}
        scale={[1, 1, 1]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

function App() {

  const [chats, setChats] = useState([{ msg: 'Hi! I\'m Joi, Michael McCullough\'s AI assistant. I can tell you about Michael\'s skills, projects, certifications, and experience in AI engineering. What would you like to know?', who: 'bot', exct: '0' }])
  const [text, setText] = useState("Hello! I am Joi, Michael McCullough's AI assistant. I can share information about Michael's expertise in AI engineering, LLM fine-tuning, RAG systems, and more!");
  const [msg, setMsg] = useState("");
  const [load, setLoad] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [visits, setVisits] = useState("--");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [chatOpen, setChatOpen] = useState(false); // New state for chat widget

  // Add global error handlers
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Don't show toast for connection errors from extensions
      if (event.reason && event.reason.message && 
          !event.reason.message.includes('Could not establish connection') &&
          !event.reason.message.includes('Receiving end does not exist')) {
        toast.error('An error occurred: ' + event.reason.message);
      }
    };

    const handleError = (event) => {
      console.error('Global error:', event.error);
      if (event.error && event.error.message && 
          !event.error.message.includes('Could not establish connection') &&
          !event.error.message.includes('Receiving end does not exist')) {
        toast.error('An error occurred: ' + event.error.message);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const getResposnse = async (msg) => {
    if (msg === '') {
      toast.error("Prompt can't be empty.[In some browsers mic may not work]");
      return;
    }
    if (load === true || speak === true || isProcessing === true) {
      toast.error("Already generating response!");
      return;
    }
    
    setIsProcessing(true); // Set processing flag
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
      setLoad(false);
      
      // Add bot response to chat immediately
      setChats(chats => [...chats, { msg: response, who: 'bot', exct: timeTaken / 1000 }]);
      
    } catch (error) {
      console.error('Error getting response:', error);
      toast.error(error.message || "Failed to get response. Make sure Ollama is running.");
      setLoad(false);
    } finally {
      setIsProcessing(false); // Clear processing flag
      // Also reset audio flag in case of errors
      setIsPlayingAudio(false);
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
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.text();
      console.log('Visitor count result:', result);

      const parsedResult = JSON.parse(result);
      setVisits(parsedResult.message || '--');
    } catch (error) {
      console.error('Failed to get visitor count:', error);
      setVisits('--');
      // Don't show toast error for visitor count as it's not critical
    }
  }
  useEffect(() => {
    getWebsiteVisits();
  }, [])
  useEffect(() => {
    if (chatOpen) {
      document.querySelector('.chat-box')?.scrollTo({
        top: document.querySelector('.chat-box')?.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chats, chatOpen])

  const [speak, setSpeak] = useState(false);
  const [playing, setPlaying] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const [listeningTimeout, setListeningTimeout] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Add processing flag
  
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

    try {
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
    } catch (error) {
      console.error('Speech recognition error:', error);
      toast.error("Failed to start voice recognition. Try refreshing the page.");
      setIsListening(false);
    }
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

      {/* Chat Widget */}
      <div className="chat-widget">
        {/* Chat Toggle Button */}
        <button 
          className={`chat-toggle ${chatOpen ? 'active' : ''}`}
          onClick={() => setChatOpen(!chatOpen)}
        >
          {chatOpen ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>

        {/* Chat Window */}
        <div className={`chat-window ${chatOpen ? 'open' : ''}`}>
          {/* Chat Header */}
          <div className="chat-header">
            <h3>Joi - AI Assistant</h3>
            <p>Ask me about Michael's expertise</p>
            <button 
              className="chat-close-btn"
              onClick={() => setChatOpen(false)}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Avatar Container */}
          <div className="chat-avatar-container">
            <Canvas 
              className="chat-canvas"
              dpr={2}
              camera={false}
              resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
              onCreated={(ctx) => {
                ctx.gl.physicallyCorrectLights = true;
                // Disable zoom controls
                ctx.gl.domElement.style.touchAction = 'none';
                ctx.gl.domElement.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
              }}
            >
              <OrthographicCamera
                makeDefault
                zoom={800}
                position={[0, 1.4, 1]}
                rotation={[0, 0, 0]}
                near={0.1}
                far={1000}
                left={-2}
                right={2}
                top={2}
                bottom={-2}
              />

              <Suspense fallback={null}>
                <Environment background={false} files="/images/photo_studio_loft_hall_1k.hdr" />
              </Suspense>

              <Suspense fallback={null}>
                <Avatar
                  avatar_url="/model.glb"
                  speak={speak}
                  setSpeak={setSpeak}
                  text={text}
                  playing={playing}
                  setPlaying={setPlaying}
                  isPlayingAudio={isPlayingAudio}
                  setIsPlayingAudio={setIsPlayingAudio}
                  load={load}
                />
              </Suspense>
            </Canvas>
          </div>

          {/* Chat Content */}
          <div className="chat-content">
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

              {(load === true || speak) && !playing ? (
                <div className="loading-container">
                  <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                  <span>Thinking...</span>
                </div>
              ) : <></>}
              
              {isListening && (
                <div className="listening-indicator">
                  🎤 Listening...
                  <span className="listening-cancel" onClick={cancelListening}>Cancel</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="chat-input">
              <div className='msg-box'>
                <button 
                  className={`msgbtn ${isListening ? 'listening' : ''}`} 
                  onMouseDown={isListening ? stopListening : startListening}
                  onTouchStart={isListening ? stopListening : startListening}
                >
                  <img src='./images/icons/mic.png' alt='mic' />
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
                  placeholder={isListening ? 'Listening...' : 'Ask me anything about Michael...'}
                />
                <button className='msgbtn' onClick={() => { 
                  if (isListening) {
                    stopListening();
                  } else {
                    getResposnse(msg);
                  }
                }}>
                  <img src='./images/icons/send.png' alt='send' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Loader dataInterpolation={(p) => `Loading... please wait`} />
    </div>
  )
}

export default App;
