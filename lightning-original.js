// Extracted from the public FUNTECH CI bundle 6a9ad94d31db20cd.js.
// Original shader and setters preserved. React mounting is replaced by a vanilla Three.js host.
import * as _ from 'three';
export const ORIGINAL_MOTION = {burstSpawnInterval:.12,defaultBurstCount:10,defaultBurstInterval:2,defaultEdgeColor:"#1c1d1e",defaultHeight:.5,defaultLifetime:1.5,defaultMaxInstances:16,defaultRadius:[.3,.8],defaultRateOverTime:2,defaultScaleRange:[.5,1],lifetimeBase:.35,lifetimeVariance:.7,scaleYVariance:.6,textureSpeed:.2,lineWidth:.24,edgeWidth:.1,edgeSoftness:.04,tipAlphaPower:1.4,tipFadeLength:.18,tipMinWidthScale:.12,thresholdAttackProgress:.1,thresholdAttackScale:10.2,thresholdDecayScale:.86};
export const ORIGINAL_SCENE = {bounds:{x:[-1.2,1.2],y:[-.62,.62],z:[.04,.08]},burstCount:8,burstInterval:1.6,maxInstances:14,rateOverTime:4,scaleRange:[.36,.59],edgeColor:'#1c1d1e'};
const x={DEFAULT_MANGA_LINE_COLOR:'#FF481B'};
const y={WEBGL_LIGHTNING_MOTION:ORIGINAL_MOTION};
export class OriginalLightningMaterial extends _.ShaderMaterial{constructor(e,t){super({uniforms:{uBloomSourceMask:{value:0},uTexture:{value:e},uTime:{value:0},uColor:{value:new _.Color(x.DEFAULT_MANGA_LINE_COLOR)},uEdgeColor:{value:new _.Color(0,1,1.2)},uSpeed:{value:t},uLineWidth:{value:y.WEBGL_LIGHTNING_MOTION.lineWidth},uEdgeWidth:{value:y.WEBGL_LIGHTNING_MOTION.edgeWidth},uEdgeSoftness:{value:y.WEBGL_LIGHTNING_MOTION.edgeSoftness},uOpacity:{value:1},uTipAlphaPower:{value:y.WEBGL_LIGHTNING_MOTION.tipAlphaPower},uTipFadeLength:{value:y.WEBGL_LIGHTNING_MOTION.tipFadeLength},uTipMinWidthScale:{value:y.WEBGL_LIGHTNING_MOTION.tipMinWidthScale}},vertexShader:`
            attribute float aLightningAlong;
            attribute float aThreshold;

            varying float vLightningAlong;
            varying float vThreshold;
            varying vec2 vUv;

            void main() {
               vLightningAlong = aLightningAlong;
               vThreshold = aThreshold;
               vUv = uv;
               vec4 transformedPosition = vec4(position, 1.0);

               #ifdef USE_INSTANCING
                  transformedPosition = instanceMatrix * transformedPosition;
               #endif

               gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
            }
         `,fragmentShader:`
            precision mediump float;

            uniform sampler2D uTexture;
            uniform float uBloomSourceMask;
            uniform float uTime;
            uniform vec3 uColor;
            uniform vec3 uEdgeColor;
            uniform float uSpeed;
            uniform float uLineWidth;
            uniform float uEdgeWidth;
            uniform float uEdgeSoftness;
            uniform float uOpacity;
            uniform float uTipAlphaPower;
            uniform float uTipFadeLength;
            uniform float uTipMinWidthScale;

            varying float vLightningAlong;
            varying float vThreshold;
            varying vec2 vUv;

            void main() {
               vec2 scrolledUv = vec2(vUv.x + uTime * uSpeed, vUv.y);
               float dist = texture2D(uTexture, scrolledUv).r;
               float edgeValue = dist - (1.0 - vThreshold);
               float tipFadeLength = clamp(uTipFadeLength, 0.001, 0.49);
               float tipMask = smoothstep(0.0, tipFadeLength, vLightningAlong)
                  * smoothstep(0.0, tipFadeLength, 1.0 - vLightningAlong);
               float minWidthScale = clamp(uTipMinWidthScale, 0.0, 1.0);
               float lineWidth = clamp(uLineWidth, 0.0, 0.35)
                  * mix(minWidthScale, 1.0, tipMask);
               float alphaThreshold = 0.4 - lineWidth;
               float edgeWidth = clamp(uEdgeWidth, 0.0, 0.35);
               float edgeSoftness = max(uEdgeSoftness, 0.001);
               float colorThreshold = alphaThreshold + edgeWidth;
               float colorMix = smoothstep(colorThreshold, colorThreshold + edgeSoftness, edgeValue);
               float alpha = smoothstep(alphaThreshold, alphaThreshold + edgeSoftness, edgeValue);
               alpha *= pow(tipMask, max(uTipAlphaPower, 0.001));
               vec3 finalColor = mix(uEdgeColor, uColor, colorMix);
               float bloomCoreMask = smoothstep(0.36, 1.0, colorMix);
               vec3 bloomSourceColor = vec3(bloomCoreMask);
               finalColor = mix(
                  finalColor,
                  bloomSourceColor,
                  step(0.5, uBloomSourceMask)
               );

               gl_FragColor = vec4(finalColor, alpha * uOpacity);
            }
         `,transparent:!0,side:_.DoubleSide,depthWrite:!1,depthTest:!1})}setTime(e){this.uniforms.uTime.value=e}setColor(e){this.uniforms.uColor.value.setStyle(e)}setEdgeColor(e){this.uniforms.uEdgeColor.value.setStyle(e)}setBloomSourceMaskEnabled(e){this.uniforms.uBloomSourceMask.value=+!!e}setSpeed(e){this.uniforms.uSpeed.value=e}setLineWidth(e){this.uniforms.uLineWidth.value=e}setEdgeWidth(e){this.uniforms.uEdgeWidth.value=e}setEdgeSoftness(e){this.uniforms.uEdgeSoftness.value=e}setOpacity(e){this.uniforms.uOpacity.value=e}setTipAlphaPower(e){this.uniforms.uTipAlphaPower.value=e}setTipFadeLength(e){this.uniforms.uTipFadeLength.value=e}setTipMinWidthScale(e){this.uniforms.uTipMinWidthScale.value=e}}
