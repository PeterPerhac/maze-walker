import * as THREE from 'three';
import {PointerLockControls} from 'controls';
import {SVGLoader} from 'svgloader';

const distanceWalkedSpan = document.getElementById('distance-walked');
const elapsedSecondsSpan = document.getElementById('elapsed-seconds');
let distanceWalked = 0.0;
let elapsedSeconds = 0;

const loadingManager = new THREE.LoadingManager(function () {
    console.log('Loading complete!');
    loadingIndicator.style.display = 'none';
    clickToPlay.style.display = 'block';
    animate();
}, function (url, itemsLoaded, itemsTotal) {
    loadingIndicator.innerText = `Loading... (${itemsLoaded} of ${itemsTotal})`;
});

const textureLoader = new THREE.TextureLoader(loadingManager);
const svgLoader = new SVGLoader(loadingManager);
const audioLoader = new THREE.AudioLoader(loadingManager);

let scene, camera, renderer;
let controls, candle, ambientLight, tinaSpotlight;
let objects = [];
let ceiling, gallerySpotlight;
let backgroundMusic;
let smolLites = [];
let smolLitesOn = false;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let lottaLite = false;
let collisionDetection = true;
let superfast = false;
let isWireframe = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const wallSize = 10;
const wallThickness = 0.5;
const defaultSpeed = 150;
let speedMultiplier = 1.0;
const defaultLightRange = 50;
const candleLightColor = 0xffaa33;
const defaultBobbingSpeed = 12;
const defaultBobbingAmount = 0.6;
const defaultFogginess = 0.02;
const defaultAmbientLightIntensity = 0.4;

const eyeHeight = wallSize / 2 + 1;

const mazeEndPoint = new THREE.Vector3(0, wallSize / 2, 0);

let isDropping = false;
let dropTargetY = eyeHeight;
let reachedRoom, nearEnd, reachedEnd = false;
let reachedEndFrame = 0;
let inCloseProximityOfEnd = false;
let dropSpeed = 10;
let dropAcceleration = 1.02;
const maxDropDepth = 700.0;
let isPaused = true;
let frameCounter = 0;

if (window.devMode === undefined) {
    window.devMode = true;
}

init();

const clickToPlay = document.getElementById('click-to-play');
const loadingIndicator = document.getElementById('loading-indicator');

clickToPlay.addEventListener('click', function () {
    if (!controls.isLocked) {
        isPaused = false;
        prevTime = performance.now();
        controls.lock();
    }
    if (!backgroundMusic.isPlaying) {
        backgroundMusic.play();
        footsteps.play();
    }
});


function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);

    setInterval(updateTimer, 1000);
    camera.position.set(0, eyeHeight, 285); //player initial position

    if (devMode) {
        camera.position.set(0, eyeHeight, -100); //player initial position for debugging (comment out later)
        camera.rotation.y = -Math.PI;
    }

    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    // Add light (candle flame) to the controls object
    candle = new THREE.PointLight(candleLightColor, 1, defaultLightRange, 3);
    controls.getObject().add(candle);

    ambientLight = new THREE.AmbientLight(0x330055, defaultAmbientLightIntensity);
    scene.add(ambientLight);

    tinaSpotlight = new THREE.SpotLight(0x0066ff, 1, 80, Math.PI / 4, 0.3, 0.1);
    tinaSpotlight.position.set(0, wallSize - 1, -60);
    tinaSpotlight.target.position.set(0, eyeHeight, 0);
    tinaSpotlight.castShadow = true;
    scene.add(tinaSpotlight);
    scene.add(tinaSpotlight.target);

    gallerySpotlight = new THREE.SpotLight(0xffffff, 1.0, 85, Math.PI / 4, 0.1, 0.1);
    gallerySpotlight.position.set(0, wallSize - 1, 20);
    gallerySpotlight.target.position.set(0, wallSize, 75);
    gallerySpotlight.castShadow = true;

    scene.fog = new THREE.FogExp2(0x000000, defaultFogginess);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    document.body.appendChild(renderer.domElement);


    // Floor texture
    const floorTexture = textureLoader.load('img/ground_color.jpg');
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(100, 100);
    floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    floorTexture.minFilter = THREE.LinearMipmapLinearFilter;
    const floorNormal = textureLoader.load('img/ground_normal.jpg');
    floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping;
    floorNormal.repeat.set(100, 100);
    floorNormal.anisotropy = renderer.capabilities.getMaxAnisotropy();
    floorNormal.minFilter = THREE.LinearMipmapLinearFilter;


    const wallTexture = textureLoader.load('img/wall_color.jpg');
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    wallTexture.minFilter = THREE.LinearMipmapLinearFilter;
    const wallEdgeTexture = textureLoader.load('img/wall_edge.jpg');
    wallEdgeTexture.minFilter = THREE.LinearMipmapLinearFilter;
    const wallEdgeTextureNormal = textureLoader.load('img/wall_edge_normal.jpg');
    wallEdgeTextureNormal.minFilter = THREE.LinearMipmapLinearFilter;
    const wallNormal = textureLoader.load('img/wall_normal.jpg');
    wallNormal.wrapS = wallNormal.wrapT = THREE.RepeatWrapping;
    wallNormal.anisotropy = renderer.capabilities.getMaxAnisotropy();
    wallNormal.minFilter = THREE.LinearMipmapLinearFilter;

    //create floor and ceiling
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
    const floorMaterial = new THREE.MeshStandardMaterial({map: floorTexture, normalMap: floorNormal});
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    ceiling = floor.clone();
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallSize;
    scene.add(ceiling);


    const outsideWallTexture = wallTexture.clone()
    outsideWallTexture.repeat.set(100, 1)

    // Create walls
    const outsideWallMaterial = new THREE.MeshStandardMaterial({map: outsideWallTexture});
    // Outer walls (boundary)
    createWall(0, wallSize / 2, -400, 800, wallSize, wallThickness, outsideWallMaterial); // Front wall
    createWall(0, wallSize / 2, 400, 800, wallSize, wallThickness, outsideWallMaterial);  // Back wall
    createWall(-400, wallSize / 2, 0, wallThickness, wallSize, 800, outsideWallMaterial); // Left wall
    createWall(400, wallSize / 2, 0, wallThickness, wallSize, 800, outsideWallMaterial);  // Right wall

    addMonuments();


    svgLoader.load('mazes/big.svg', function (data) {
        const paths = data.paths;
        let idx = 0;
        paths.forEach((path) => {
            const color = path.userData.style.stroke;
            if (color === '#ff0000' || color === 'red') return;
            const shapes = SVGLoader.createShapes(path);
            idx = idx + 1;

            shapes.forEach((shape) => {
                const points = shape.getPoints(2);
                const p1 = points[0];
                const p2 = points[1];
                const dx = p2.x - p1.x;
                const dz = p2.y - p1.y;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);

                const geometry = new THREE.BoxGeometry(length, wallSize, 1);
                const tex = wallTexture.clone();
                tex.repeat.set(length / wallSize, 1);
                const nrm = wallNormal.clone();
                nrm.repeat.set(length / wallSize, 1);

                const faceMaterial = new THREE.MeshStandardMaterial({map: tex, normalMap: nrm});
                const sideMaterial = new THREE.MeshStandardMaterial({
                    map: wallEdgeTexture, normalMap: wallEdgeTextureNormal
                });
                const wall = new THREE.Mesh(geometry, [sideMaterial, sideMaterial, sideMaterial, sideMaterial, faceMaterial, faceMaterial]);

                wall.position.set((p1.x + p2.x) / 2 - 265, wallSize / 2, -(p1.y + p2.y) / 2 + 265);
                wall.rotation.y = -angle;
                wall.castShadow = true;
                wall.receiveShadow = true;
                scene.add(wall);
                objects.push(wall);
            });
        });
    }, function () {
    }, function (error) {
        console.error('Error loading SVG:', error);
    });

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    controls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        isPaused = true;
        moveForward = false;
        moveLeft = false;
        moveBackward = false;
        moveRight = false;
        backgroundMusic.pause();
        footsteps.setVolume(0.0);
        heartbeat.pause();
        blocker.style.display = 'block';
        instructions.style.display = '';
    });


    // Movement controls
    const onKeyDown = function (event) {
        if (isDropping) return;
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
        }
    };

    const updateMaterialWireframe = function () {
        scene.traverse(function (child) {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => {
                        material.wireframe = isWireframe;
                    });
                } else {
                    child.material.wireframe = isWireframe;
                }
            }
        });
    };

    const onKeyUp = function (event) {
        if (isDropping) return;
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;

            case 'KeyL':
                if (devMode) {
                    lottaLite = !lottaLite;
                }
                break;
            case 'KeyR':
                if (devMode) {
                    ambientLight.intensity = defaultAmbientLightIntensity;
                    tinaSpotlight.intensity = 1.0;
                    scene.remove(gallerySpotlight);
                    scene.remove(gallerySpotlight.target);
                    controls.getObject().add(candle);
                    lottaLite = false;
                    collisionDetection = true;
                    superfast = false;
                    speedMultiplier = 1.0;
                    isWireframe = false;
                    reachedEnd = false;
                    nearEnd = false;
                    reachedRoom = false;
                    footsteps.stop();
                    footsteps.playbackRate = 1.00;
                    footsteps.play();
                    heartbeat.stop();
                    updateMaterialWireframe();
                }
                break;
            case 'KeyC':
                if (devMode) {
                    collisionDetection = !collisionDetection;
                }
                break;
            case 'KeyF':
                superfast = !superfast;
                bobbingSpeed = superfast ? 20 : defaultBobbingSpeed;
                bobbingAmount = superfast ? 0.33 : defaultBobbingAmount;
                footsteps.stop();
                footsteps.playbackRate = superfast ? 3.00 : 1.00;
                footsteps.play();
                break;
            case 'KeyM' :
                if (devMode) {
                    isWireframe = !isWireframe;
                    updateMaterialWireframe();
                }
                break;
            case 'Space' :
                if (!isDropping && inCloseProximityOfEnd(20)) {
                    initiateDrop();
                } else {
                    if (devMode) {
                        const pos = controls.getObject().position;
                        console.log("x, z=", pos.x, pos.z);
                    }
                }
        }
    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    window.addEventListener('resize', onWindowResize, false);
    inCloseProximityOfEnd = function (distance) {
        return mazeEndPoint.distanceTo(controls.getObject().position) < distance;
    }
}

function initiateDrop() {
    isDropping = true;
    footsteps.stop();
    crumbleSound.play();
    moveLeft = false;
    moveBackward = false;
    moveRight = false;
    moveForward = false;
    dropTargetY = camera.position.y - maxDropDepth;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

let bobbingTime = 0; // Tracks bobbing progress
let bobbingSpeed = defaultBobbingSpeed; // How fast the bobbing oscillates
let bobbingAmount = defaultBobbingAmount; // How much the camera bobs

const listener = new THREE.AudioListener();
camera.add(listener);

const loadAudio = function (opt) {
    const audio = new THREE.Audio(listener);
    audioLoader.load('sfx/' + opt.file, function (buffer) {
        audio.setBuffer(buffer);
        audio.setLoop(opt.loop);
        audio.setVolume(opt.volume);
    });
    return audio;
}

backgroundMusic = loadAudio({file: 'background.ogg', loop: true, volume: 0.7});
const gymnopedie = loadAudio({file: 'gymnopedie.ogg', loop: false, volume: 1.0});
const footsteps = loadAudio({file: 'footsteps.ogg', loop: true, volume: 0.0});
const heartbeat = loadAudio({file: 'heartbeat.ogg', loop: true, volume: 0.8});
const switchSound = loadAudio({file: 'switch.ogg', loop: false, volume: 1.0});
const breathSound = loadAudio({file: 'breath.ogg', loop: false, volume: 0.8});
const crumbleSound = loadAudio({file: 'crumble.ogg', loop: false, volume: 1.0});

function animate() {
    requestAnimationFrame(animate);

    function checkReachedEnd(playerPos) {
        if (reachedEnd) return true;
        if (!reachedEnd && inCloseProximityOfEnd(10)) {
            reachedEnd = true;
            reachedEndFrame = frameCounter;
            backgroundMusic.stop();
            heartbeat.stop();
            switchSound.play();
            backgroundMusic = gymnopedie;
            backgroundMusic.play();
            ambientLight.intensity = 0.15;
            tinaSpotlight.intensity = 0.3;
            scene.add(gallerySpotlight);
            scene.add(gallerySpotlight.target);
            addPointLights();
        }
        if (!nearEnd && inCloseProximityOfEnd(20)) {
            nearEnd = true;
            breathSound.play();
            controls.getObject().remove(candle);
        } else {
            if (!reachedRoom && inRoom(playerPos)) {
                reachedRoom = true;
                heartbeat.play();
            }
        }
        return reachedEnd;
    }

    function checkTinaGallery(playerPos) {
        const gallerySide = playerPos.z < -266;
        if (gallerySide && !smolLitesOn) {
            smolLitesOn = true;
            smolLites.forEach((l) => scene.add(l));
        } else {
            if (!gallerySide && smolLites) {
                smolLitesOn = false;
                smolLites.forEach((l) => scene.remove(l));
            }
        }
    }

    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    if (isPaused && frameCounter > 100) return;
    frameCounter++;

    function inRoom(pos) {
        return pos.x > -50 && pos.x < 50 && pos.z > -83 && pos.z < 83;
    }

    if (!isDropping) {
        if (controls.isLocked === true) {
            const playerPos = controls.getObject().position;
            const slowDown = Math.max(0.2, Math.min(1.0, Math.abs(playerPos.z - (mazeEndPoint.z - 10)) / 70));
            speedMultiplier = inRoom(playerPos) && (!reachedEnd ^ (frameCounter - reachedEndFrame < 150)) ? slowDown : 1.0;
            const speed = superfast ? 1000 : defaultSpeed * speedMultiplier;

            checkReachedEnd(playerPos);
            checkTinaGallery(playerPos);
            const lightuptheshow = lottaLite || isDropping;
            candle.distance = lightuptheshow ? 0 : defaultLightRange;
            candle.color = new THREE.Color(lottaLite ? 0xffffff : candleLightColor);
            scene.fog.density = (smolLitesOn) ? defaultFogginess / 2 : (lightuptheshow || reachedEnd) ? 0 : defaultFogginess;
            footsteps.setVolume(Math.min(0.5, Math.max(0, velocity.length()))); //don't make the footsteps sound ever louder than 0.5
            backgroundMusic.setVolume(Math.max(0.1, speedMultiplier / 2));

            // Apply friction
            velocity.x -= velocity.x * 7.5 * delta;
            velocity.z -= velocity.z * 7.5 * delta;

            // Calculate movement direction
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize(); // Ensure consistent movement speed

            // Accelerate in the direction of movement
            if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

            const oldPosition = playerPos.clone();
            const movement = new THREE.Vector3(-velocity.x * delta, 0, -velocity.z * delta);
            controls.moveRight(movement.x);
            controls.moveForward(movement.z);

            // Apply bobbing effect if moving
            bobbingTime += delta * bobbingSpeed;
            const bobbingOffset = Math.sin(bobbingTime) * bobbingAmount * (Math.min(velocity.length(), 8) / 8);
            playerPos.y = eyeHeight + bobbingOffset;

            if (collisionDetection) {
                const cameraPosition = playerPos.clone();
                const collisionSphereRadius = 2;
                const sphere = new THREE.Sphere(cameraPosition, collisionSphereRadius);
                let collision = false;

                for (let i = 0; i < objects.length; i++) {
                    const boundingBox = new THREE.Box3().setFromObject(objects[i]);
                    if (boundingBox.intersectsSphere(sphere)) {
                        collision = true;
                        break;
                    }
                }

                if (collision) {
                    playerPos.copy(oldPosition);
                    velocity.set(0, 0, 0);
                } else {
                    distanceWalked += movement.length();
                }
            } else {
                distanceWalked += movement.length();
            }
            prevTime = time;
        }
    } else {
        if (camera.position.y > dropTargetY) {
            dropSpeed = dropSpeed * dropAcceleration;
            camera.position.y -= dropSpeed * delta / 1000;
        } else {
            scene.remove(ceiling);
            lottaLite = true;
            ambientLight.intensity = 1.0;
            controls.getObject().add(candle);
        }
    }

    renderer.render(scene, camera);
}

function createWall(x, y, z, width, height, depth, wallMaterial) {
    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, y, z);
    scene.add(wall);
    objects.push(wall);
}


function addPointLights() {
    function addLight(x, z) {
        const pointLight = new THREE.PointLight(0xff7700, 0.7, 35, 5);
        pointLight.position.set(x, eyeHeight, z);
        scene.add(pointLight);
    }

    addLight(-5, 10);
    addLight(-25, 30);
    addLight(-45, 50);
    addLight(5, 10);
    addLight(25, 30);
    addLight(45, 50);
}


function addMonuments() {
    function addMonument(file, x, z, solid) {
        const wallThickness = 0.2;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(wallSize, wallSize, wallThickness), new THREE.MeshStandardMaterial({map: textureLoader.load(file)}));
        wall.position.set(x, wallSize / 2, z);
        wall.castShadow = true;
        scene.add(wall);
        if (solid) {
            objects.push(wall);
        }
    }

    addMonument('img/picture-wall.jpg', 0, 0.1);
    addMonument('img/tina-wall.jpg', 0, -0.1, true);
    addMonument('img/sadge-wall.jpg', 241, 235, true);
    addMonument('img/picture-wall-sofia.jpg', -190, -24, true);
    addMonument('img/picture-wall-sofia-daddy.jpg', 66, 150, true);
    addMonument('img/picture-wall-mummy.jpg', -110, -171, true);
    addMonument('img/picture-wall-ellie.jpg', -158, -119, true);
    addMonument('img/picture-wall-pito.jpg', 80, -264, true);
    addMonument('img/picture-wall-tina-mad.jpg', -15, 230, true);

    //on special request from Sofia:
    addMonument('img/sofia-1.jpg', 193, 40, true);
    addMonument('img/sofia-2.jpg', 209, -74, true);
    addMonument('img/sofia-3.jpg', 225, -200, true);

    addMonument('img/gallery/sofia-special-1.jpg', 33, 152, true);
    addMonument('img/gallery/sofia-special-2.jpg', -47, 150, true);
    addMonument('img/gallery/sofia-special-3.jpg', -143, -216, true);
    addMonument('img/gallery/sofia-special-4.jpg', 47, -136, true);
    addMonument('img/gallery/sofia-special-5.jpg', -45, -184, true);

    addMonument('img/picture-wall.jpg', 97, 6);

    Array.from({length: 9}).forEach((_, n) => {
        addMonument('img/gallery/family-' + (n + 1) + '.jpg', 40 - (n * wallSize), 75, false);
    })

    const numTinaPhotos = 24;
    Array.from({length: numTinaPhotos}).forEach((_, n) => {
        const picX = -(numTinaPhotos / 2 * wallSize) + (n * wallSize);
        addMonument('img/tina/tina-' + (n + 1) + '.jpg', picX, -266, false);
        if (n % 3 === 1) {
            const smolLite = new THREE.PointLight(0xffffff, 1, 50, 2);
            smolLite.position.set(picX, eyeHeight, -280);
            smolLites.push(smolLite);
        }
    })
}

function updateTimer() {
    function padZero(number) {
        return number < 10 ? '0' + number : number;
    }

    if (!(isPaused || reachedEnd)) {
        elapsedSeconds++;
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;
        elapsedSecondsSpan.innerHTML = `${hours}:${padZero(minutes)}:${padZero(seconds)}`;
        distanceWalkedSpan.innerHTML = (distanceWalked / 7).toFixed(2);
    }
}
