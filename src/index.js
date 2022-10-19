import {
  Ion,
  Viewer,
  createWorldTerrain,
  WebMapServiceImageryProvider,
  createOsmBuildings,
  OpenStreetMapImageryProvider,
  ShadowMode,
  Cartesian3,
  Matrix4,
  JulianDate,
  Math as cesiumMath,
  CesiumTerrainProvider,
  EllipsoidTerrainProvider,
  WebMercatorTilingScheme,
  TerrainProvider,
  GeographicTilingScheme,
  EntityCollection,
  ConstantProperty,
  Color,
  HeadingPitchRoll,
  PolylineGlowMaterialProperty,
  Transforms,
  KmlDataSource,
  ArcGisMapServerImageryProvider,
  MapboxStyleImageryProvider,
  HeightReference,
  IonResource,
  SampledPositionProperty,
  HeadingPitchRange,
  Model,
  Ellipsoid,
  Cesium3DTileset,
  ModelAnimationLoop,
  HorizontalOrigin,
  VerticalOrigin
} from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MzY2N2M2Yy00NDczLTQ1YmItYmJkOS1iMWMxMTAwYTQ4YjgiLCJpZCI6NjA2MiwiaWF0IjoxNjQzNzEyMjY1fQ.0cV0HEAt-9wQOXt8nOXNmVvDglqXRiPiOfoKpn2XYEk";

const viewer = new Viewer("cesiumContainer", {
  // terrainProvider: new CesiumTerrainProvider({
  //   url:"http://localhost:8090/tiles/",
  // }),
  terrainProvider: createWorldTerrain(),
  // imageryProvider: new OpenStreetMapImageryProvider({
  //   url: "https://a.tile.openstreetmap.org/",
  // }),
  imageryProvider: new ArcGisMapServerImageryProvider({
    url : 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer'
  }),
  // imageryProvider: new MapboxStyleImageryProvider({
  //   styleId: 'streets-v11',
  //   accessToken: 'pk.eyJ1Ijoic2FhZGF0MjkzMCIsImEiOiJjam5hYWZ3eXY0YWp4M3BxdmtrZTc3aTIxIn0.zkUyZR1Gx8ZGIk-52rxawA',
  //   tilesize: 256,
  //   scaleFactor: true,
  // }),
  // animation: false,
  geocoder: false,
  // baseLayerPicker: true,
  // timeline: false,
  fullscreenButton: false,
  homeButton: false,
  // scene3DOnly: true,
  // shadows: false,
  // fitNearFar: true,
  // fitNearFarEnabled: true,
  // softShadows: false,
  // softShadowsEnabled: false,
  // navigationHelpButton: false,
  // infoBox: false,
  // selectionIndicator: false,
  // requestRenderMode: false,
  // maximumRenderTimeChange: Infinity,
  // terrainShadows: ShadowMode.DISABLED,
});
viewer.scene.globe.depthTestAgainstTerrain = true;
// viewer.scene.globe.enableLighting = true;
// viewer.scene.postProcessStages.fxaa.enabled = true;
document.getElementsByClassName("cesium-widget-credits")[0].style.display =
  "none";


  const pathPosition = new SampledPositionProperty();
const entityPath = viewer.entities.add({
  position: pathPosition,
  name: "path",
  path: {
    show: true,
    leadTime: 0,
    trailTime: 60,
    width: 10,
    resolution: 1,
    material: new PolylineGlowMaterialProperty({
      glowPower: 0.3,
      taperPower: 0.3,
      color: Color.PALEGOLDENROD,
    }),
  },
});

const camera = viewer.camera;
const scene = viewer.scene
const controller = viewer.scene.screenSpaceCameraController;
let r = 0;

const hpRoll = new HeadingPitchRoll();
const hpRange = new HeadingPitchRange();
let speed = 10;
const deltaRadians = cesiumMath.toRadians(3.0);

let position = Cartesian3.fromDegrees(
  72.368491,34.777420,
  1500.0
);
let speedVector = new Cartesian3();
const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
  "north",
  "west"
);

const planePrimitive = scene.primitives.add(
  Model.fromGltf({
    url: "./f-35.glb",
    modelMatrix: Transforms.headingPitchRollToFixedFrame(
      position,
      hpRoll,
      Ellipsoid.WGS84,
      fixedFrameTransform
    ),
    minimumPixelSize: 128,
    eyeOffset: new Cartesian3(0.0, 0.0, 0.0), 
    horizontalOrigin: HorizontalOrigin.CENTER, 
    verticalOrigin: VerticalOrigin.BOTTOM, 
    alignedAxis: Cartesian3.ZERO, 
    scale:2.0
  })
);

planePrimitive.readyPromise.then(function (model) {
  // Play and loop all animations at half-speed
  model.activeAnimations.addAll({
    multiplier: 0.5,
    loop: ModelAnimationLoop.REPEAT,
  });

  // Zoom to model
  r = 2.0 * Math.max(model.boundingSphere.radius, camera.frustum.near);
  controller.minimumZoomDistance = r * 0.5;
  const center = model.boundingSphere.center;
  const heading = cesiumMath.toRadians(230.0);
  const pitch = cesiumMath.toRadians(-20.0);
  hpRange.heading = heading;
  hpRange.pitch = pitch;
  hpRange.range = r * 50.0;
  camera.lookAt(center, hpRange);
});
viewer.scene.preUpdate.addEventListener(function (scene, time) {
  speedVector = Cartesian3.multiplyByScalar(
    Cartesian3.UNIT_X,
    speed / 10,
    speedVector
  );
  position = Matrix4.multiplyByPoint(
    planePrimitive.modelMatrix,
    speedVector,
    position
  );
  pathPosition.addSample(JulianDate.now(), position);
  Transforms.headingPitchRollToFixedFrame(
    position,
    hpRoll,
    Ellipsoid.WGS84,
    fixedFrameTransform,
    planePrimitive.modelMatrix
  );
});

window.document.addEventListener("keydown", function (e) {
  switch (e.keyCode) {
    case 40:
      if (e.shiftKey) {
        // speed down
        speed = Math.max(--speed, 1);
      } else {
        // pitch down
        hpRoll.pitch -= deltaRadians;
        if (hpRoll.pitch < -cesiumMath.TWO_PI) {
          hpRoll.pitch += cesiumMath.TWO_PI;
        }
      }
      break;
    case 38:
      if (e.shiftKey) {
        // speed up
        speed = Math.min(++speed, 100);
      } else {
        // pitch up
        hpRoll.pitch += deltaRadians;
        if (hpRoll.pitch > cesiumMath.TWO_PI) {
          hpRoll.pitch -= cesiumMath.TWO_PI;
        }
      }
      break;
    case 39:
      if (e.shiftKey) {
        // roll right
        hpRoll.roll += deltaRadians;
        if (hpRoll.roll > cesiumMath.TWO_PI) {
          hpRoll.roll -= cesiumMath.TWO_PI;
        }
      } else {
        // turn right
        hpRoll.heading += deltaRadians;
        if (hpRoll.heading > cesiumMath.TWO_PI) {
          hpRoll.heading -= cesiumMath.TWO_PI;
        }
      }
      break;
    case 37:
      if (e.shiftKey) {
        // roll left until
        hpRoll.roll -= deltaRadians;
        if (hpRoll.roll < 0.0) {
          hpRoll.roll +=cesiumMath.TWO_PI;
        }
      } else {
        // turn left
        hpRoll.heading -= deltaRadians;
        if (hpRoll.heading < 0.0) {
          hpRoll.heading += cesiumMath.TWO_PI;
        }
      }
      break;
    default:
  }
});


const addBillboard = (name,url,lat,long,height,scale) => {
  viewer.entities.add({
    name:name,
    position: Cartesian3.fromDegrees(long, lat,height),
    billboard: {
      image: url,
      scale:scale,
      eyeOffset: new Cartesian3(0.0, 0.0, 0.0), 
      horizontalOrigin: HorizontalOrigin.CENTER, 
      verticalOrigin: VerticalOrigin.BOTTOM, 
      alignedAxis: Cartesian3.ZERO, 
      heightReference:HeightReference.CLAMP_TO_GROUND
    },
    
  });
}
addBillboard("Battalion","images/mil-symbols/bitallion.svg",34.787515, 72.362802,931,0.25);
addBillboard("Company","iimages/mil-symbols/company.svg",34.786515, 72.362802,931,0.25);
addBillboard("Patrolling","images/mil-symbols/patrolling.svg",34.787515, 72.363802,931,0.25);
addBillboard("Line of Sight","images/mil-symbols/los.svg",34.784510, 72.386672,1374,0.25);
addBillboard("Combat","images/mil-symbols/combat.svg",34.77726490988941, 72.37349608014416,1270,0.25);
// addBillboard("images/brigade.svg",34.787515, 72.362802,931);
