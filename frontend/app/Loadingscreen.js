import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const VIDEO_W = Math.min(width * 0.35, 200);
const VIDEO_H = VIDEO_W * (9 / 16);

function goToApp() {
  router.replace('/record-experience');
}

// KEY_COLOR = rgba(122, 150, 108) / 255
const FRAG_SHADER = `
  precision mediump float;
  uniform sampler2D u_tex; varying vec2 v_uv;

  // KEY_COLOR = #00ff08 = rgb(0, 255, 8) / 255
  const vec3  KEY_COLOR = vec3(0.0, 1.0, 0.031);
  const float THRESHOLD = 0.45;
  const float SMOOTHING = 0.15;

  void main(){
    vec4 c = texture2D(u_tex, v_uv);

    // ── Pass 1: RGB distance key ───────────────────────────────────────────────
    // Wide threshold to catch H.264 4:2:0 chroma-subsampled edge fringing
    float diff = length(c.rgb - KEY_COLOR);
    float alpha = smoothstep(THRESHOLD - SMOOTHING, THRESHOLD + SMOOTHING, diff);

    // ── Pass 2: green spill suppressor ────────────────────────────────────────
    // #00ff08 is nearly pure green so any pixel where green channel dominates
    // red+blue by more than 40% is spill/fringe — remove it.
    float spillAmt = c.g - max(c.r, c.b);
    float spillAlpha = 1.0 - smoothstep(0.30, 0.55, spillAmt);

    alpha = min(alpha, spillAlpha);

    gl_FragColor = vec4(c.rgb, c.a * alpha);
  }
`;

const VERT_SHADER = `
  attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv;
  void main(){ gl_Position=vec4(a_pos,0,1); v_uv=a_uv; }
`;

//iOS: WebView HTML
const buildChromaHtml = (videoSrc) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:100%; height:100%; background:transparent; overflow:hidden; }
    canvas { display:block; width:100%; height:100%; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <video id="v" src="${videoSrc}" autoplay muted playsinline
         style="display:none;"></video>
  <script>
    const video  = document.getElementById('v');
    const canvas = document.getElementById('c');
    const gl     = canvas.getContext('webgl');

    const vsSource = \`${VERT_SHADER}\`;
    const fsSource = \`${FRAG_SHADER}\`;

    function mkShader(type, src){
      const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s;
    }
    const prog=gl.createProgram();
    gl.attachShader(prog,mkShader(gl.VERTEX_SHADER,vsSource));
    gl.attachShader(prog,mkShader(gl.FRAGMENT_SHADER,fsSource));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0,1,1,-1,1,1,-1,1,0,0,1,1,1,0]),gl.STATIC_DRAW);
    const aPos=gl.getAttribLocation(prog,'a_pos');
    const aUV =gl.getAttribLocation(prog,'a_uv');
    gl.enableVertexAttribArray(aPos); gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,16,0);
    gl.vertexAttribPointer(aUV, 2,gl.FLOAT,false,16,8);

    const tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    // Set canvas resolution once at correct DPR
    function initSize(){
      const dpr=window.devicePixelRatio||1;
      canvas.width=canvas.clientWidth*dpr; canvas.height=canvas.clientHeight*dpr;
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    window.addEventListener('load', initSize);
    setTimeout(initSize, 100); // fallback for WKWebView

    let rafId;
    function render(){
      if(video.readyState>=2){
        gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
      rafId=requestAnimationFrame(render);
    }

    video.addEventListener('ended', () => {
      cancelAnimationFrame(rafId);
      window.ReactNativeWebView.postMessage('VIDEO_ENDED');
    });

    rafId=requestAnimationFrame(render);
    video.play().catch(()=>{});
  </script>
</body>
</html>
`;

//Web platform - WebGL
function WebChromaVideo({ src, width: vidW, height: vidH, onEnded }) {
  const canvasRef = useRef(null);
  const videoRef  = useRef(null);

  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    function mkShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, VERT_SHADER));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FRAG_SHADER));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1,0,1, 1,-1,1,1, -1,1,0,0, 1,1,1,0]),
      gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog,'a_pos');
    const aUV  = gl.getAttribLocation(prog,'a_uv');
    gl.enableVertexAttribArray(aPos); gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,16,0);
    gl.vertexAttribPointer(aUV, 2,gl.FLOAT,false,16,8);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = vidW * dpr;
    canvas.height = vidH * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    let raf;
    function render() {
      if (video.readyState >= 2) {
        gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
      raf = requestAnimationFrame(render);
    }

    video.addEventListener('ended', () => {
      cancelAnimationFrame(raf);
      onEnded?.();
    });

    raf = requestAnimationFrame(render);
    video.play().catch(()=>{});

    return () => cancelAnimationFrame(raf);
  }, [src, vidW, vidH, onEnded]);

  return React.createElement('div', {
    style: { width: vidW, height: vidH, position: 'relative' }
  }, [
    React.createElement('video', {
      key: 'v', ref: videoRef, src,
      autoPlay: true, muted: true, playsInline: true, crossOrigin: 'anonymous',
      style: { display: 'none' },
    }),
    React.createElement('canvas', {
      key: 'c', ref: canvasRef,
      style: { width: vidW, height: vidH, display: 'block' },
    }),
  ]);
}

export default function LoadingScreen() {
  const [videoUri, setVideoUri] = useState(null);

  const [fontsLoaded] = useFonts({
    Carattere: require('../assets/fonts/Carattere-Regular.ttf'),
  });

  useEffect(() => {
    try {
      const asset = Asset.fromModule(require('../assets/video/logo1.mp4'));
      const uri = asset.uri;
      console.log('[LoadingScreen] videoUri:', uri);
      setVideoUri(uri);
    } catch (e) {
      console.warn('[LoadingScreen] Could not load video asset:', e);
    }
  }, []);

  const webViewSource = useMemo(() => {
    if (!videoUri || Platform.OS === 'web') return null;
    console.log('[LoadingScreen] WebView videoSrc:', videoUri);
    // baseUrl must match the video URI origin so WKWebView allows the request.
    // For dev: http://192.x.x.x:8081, for prod: the bundled file:// origin.
    const origin = videoUri.startsWith('http')
      ? videoUri.match(/^https?:\/\/[^/]+/)?.[0]   // regex for http://100.70.89.132:8081
      : videoUri.substring(0, videoUri.lastIndexOf('/') + 1); // file:// dir
    return { html: buildChromaHtml(videoUri), baseUrl: origin };
  }, [videoUri]);

  const handleWebViewMessage = useCallback((event) => {
    if (event.nativeEvent.data === 'VIDEO_ENDED') goToApp();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EDEAE4" />
      <Text style={styles.brandText}>JustAteIt</Text>

      {videoUri ? (
        Platform.OS === 'web' ? (
          <WebChromaVideo src={videoUri} width={VIDEO_W} height={VIDEO_H} onEnded={goToApp} />
        ) : (
          <View style={styles.videoWrapper}>
            <WebView
              source={webViewSource}
              style={styles.webview}
              scrollEnabled={false}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              backgroundColor="transparent"
              originWhitelist={['*']}
              javaScriptEnabled={true}
              isOpaque={false}
              opacity={1}
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
              onMessage={handleWebViewMessage}
            />
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontFamily: 'Carattere',
    fontSize: 54,
    color: '#111111',
    letterSpacing: 0.5,
    marginBottom: 18,
    textShadowColor: 'rgba(0,0,0,0.06)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  videoWrapper: {
    width: VIDEO_W,
    height: VIDEO_H,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});