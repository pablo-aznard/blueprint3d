/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../../lib/three.d.ts" />

/// <reference path="controller.ts" />
/// <reference path="floorPlan.ts" />
/// <reference path="lights.ts" />
/// <reference path="controls.ts" />
/// <reference path="hud.ts" />
/// <reference path="human.ts" />

module BP3D.Three {
    export var Main = function (model, element, canvasElement, opts) {
        var scope = this;

        var options = {
            resize: true,
            pushHref: false,
            spin: true,
            spinSpeed: .00002,
            clickPan: true,
            canMoveFixedItems: false
        }

        // override with manually set options
        for (var opt in options) {
            if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
                options[opt] = opts[opt]
            }
        }

        var scene = model.scene;

        var model = model;
        this.element = $(element);
        var domElement;

        var camera;
        var renderer;
        this.controls;
        var canvas;
        var controller;
        var floorplan;

        var meshes = [];
        var mixers = [];
        // var human = new Human(scene, model);
        var loadMovement = new LoadMovement(scene, model);

        var video;
        var imageContext;
        var textureVideo;
        var paused = 1;
        var timeRender = 0;
        // var stepTime = 1000;
        // var step = 1;

        //var canvas;
        //var canvasElement = canvasElement;

        var needsUpdate = false;

        var lastRender = Date.now();
        var lastRender2= 0;
        var mouseOver = false;
        var hasClicked = false;

        var hud;

        this.heightMargin;
        this.widthMargin;
        this.elementHeight;
        this.elementWidth;

        this.itemSelectedCallbacks = $.Callbacks(); // item
        this.itemUnselectedCallbacks = $.Callbacks();

        this.wallClicked = $.Callbacks(); // wall
        this.floorClicked = $.Callbacks(); // floor
        this.nothingClicked = $.Callbacks();
        // var customUniforms;

        function init() {
            THREE.ImageUtils.crossOrigin = "";

            domElement = scope.element.get(0) // Container
            camera = new THREE.PerspectiveCamera(45, 1, 1, 14500);
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                preserveDrawingBuffer: true // required to support .toDataURL()
            });
            renderer.autoClear = false,
                renderer.shadowMapEnabled = true;
            renderer.shadowMapSoft = true;
            renderer.shadowMapType = THREE.PCFSoftShadowMap;
            renderer.setClearColor( 0x808080, 1);
            // var skybox = new Three.Skybox(scene);

            scope.controls = new Three.Controls(camera, domElement);

            hud = new Three.HUD(scope);

            controller = new Three.Controller(
                scope, model, camera, scope.element, scope.controls, hud);

            domElement.appendChild(renderer.domElement);

            // handle window resizing
            scope.updateWindowSize();
            if (options.resize) {
                $(window).resize(scope.updateWindowSize);
            }

            // setup camera nicely
            scope.centerCamera();
            model.floorplan.fireOnUpdatedRooms(scope.centerCamera);
            var lights = new Three.Lights(scene, model.floorplan);

            floorplan = new Three.Floorplan(scene,
                model.floorplan, scope.controls);
            animate();

            scope.element.mouseenter(function () {
                mouseOver = false;
            }).mouseleave(function () {
                mouseOver = false;
            }).click(function () {
                hasClicked = false;
            });


        }

        function spin() {
            if (options.spin && !mouseOver && !hasClicked) {
                // var theta = 2 * Math.PI * options.spinSpeed * (Date.now() - lastRender);
                // scope.controls.rotateLeft(theta);
                scope.controls.update()
            }
        }

        this.dataUrl = function () {
            var dataUrl = renderer.domElement.toDataURL("image/png");
            return dataUrl;
        }

        this.stopSpin = function () {
            hasClicked = true;
        }

        this.options = function () {
            return options;
        }

        this.getModel = function () {
            return model;
        }

        this.getScene = function () {
            return scene;
        }

        this.getController = function () {
            return controller;
        }

        this.getCamera = function () {
            return camera;
        }

        this.needsUpdate = function () {
            needsUpdate = true;

        }
        function shouldRender() {
            // Do we need to draw a new frame
            if (scope.controls.needsUpdate || controller.needsUpdate || needsUpdate || model.scene.needsUpdate) {
                scope.controls.needsUpdate = false;
                controller.needsUpdate = false;
                needsUpdate = false;
                model.scene.needsUpdate = false;
                return true;
            } else {
                return false;
            }
        }

        function render() {
            spin();
            if (shouldRender()) {
                renderer.clear();
                renderer.render(scene.getScene(), camera);
                renderer.clearDepth();
                renderer.render(hud.getScene(), camera);
            }


            //Check if the simulation is paused
            if(model.play) {

                // human.moveAll(scene.step);

                lastRender2 = lastRender;
                lastRender = Date.now();
                console.log("LASTRENDER2", lastRender2, "lastrender", lastRender);
                console.log("STEPTIE", lastRender-lastRender2);
                console.log("LASTRENDER", lastRender - scene.initialTime);
                console.log("difference",  lastRender+(lastRender-lastRender2));
                if( lastRender - scene.initialTime >= scene.stepTime || lastRender+(lastRender-lastRender2)- scene.initialTime>scene.stepTime){
                    scene.initialTime = lastRender;
                    scene.step += 1;
                    scene.flag = 1;
                }
                loadMovement.moveAll(scene.step);
                if (scene.video &&  scene.video.readyState === scene.video.HAVE_ENOUGH_DATA ) {

                    scene.imageContext.drawImage( scene.video, 0, 0 );

                    if ( scene.textureVideo ) scene.textureVideo.needsUpdate = true;

                }
            }
            else{

                if(paused ==1) {
                    paused+=1;

                }
            }
            var date = new Date();
            scene.fps = 1000/( date.getTime() - timeRender);
            timeRender = date.getTime();
        };



        function animate() {
            var delay = 50;
            var delta = 0.04;
            //FIRE
            if(scene.customUniforms!=undefined){
                scene.customUniforms.time.value += delta;

            }
            setTimeout(function () {
                requestAnimationFrame(animate);
            }, delay);
            render();

        }

        this.rotatePressed = function () {
            controller.rotatePressed();
        }

        this.rotateReleased = function () {
            controller.rotateReleased();
        }

        this.setCursorStyle = function (cursorStyle) {
            domElement.style.cursor = cursorStyle;
        };

        this.updateWindowSize = function () {
            scope.heightMargin = scope.element.offset().top;
            scope.widthMargin = scope.element.offset().left;

            scope.elementWidth = scope.element.innerWidth();
            if (options.resize) {
                scope.elementHeight = window.innerHeight - scope.heightMargin;
            } else {
                scope.elementHeight = scope.element.innerHeight();
            }

            camera.aspect = scope.elementWidth / scope.elementHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(scope.elementWidth, scope.elementHeight);
            needsUpdate = true;
        }

        this.centerCamera = function () {
            var yOffset = 150.0;

            var pan = model.floorplan.getCenter();
            pan.y = yOffset;

            scope.controls.target = pan;

            var distance = model.floorplan.getSize().z * 1.5;

            var offset = pan.clone().add(
                new THREE.Vector3(0, distance, distance));
            //scope.controls.setOffset(offset);
            camera.position.copy(offset);

            scope.controls.update();
        }

        // projects the object's center point into x,y screen coords
        // x,y are relative to top left corner of viewer
        this.projectVector = function (vec3, ignoreMargin) {
            ignoreMargin = ignoreMargin || false;

            var widthHalf = scope.elementWidth / 2;
            var heightHalf = scope.elementHeight / 2;

            var vector = new THREE.Vector3();
            vector.copy(vec3);
            vector.project(camera);

            var vec2 = new THREE.Vector2();

            vec2.x = (vector.x * widthHalf) + widthHalf;
            vec2.y = - (vector.y * heightHalf) + heightHalf;

            if (!ignoreMargin) {
                vec2.x += scope.widthMargin;
                vec2.y += scope.heightMargin;
            }

            return vec2;
        }

        init();
    }
}
