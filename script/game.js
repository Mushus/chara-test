!function(global) {
  "use strict";

  /** キャラクタ */
  global.Chara = function Chara(mesh) {
    this.mesh = mesh;
    this.emotion = new Emotion(mesh.material);
    this.mixer = new THREE.AnimationMixer(mesh);
    this.state = new CharaState(this);
    this.ready = null;
    this.move = null;
    var materials = mesh.material.materials;
    for (var i in materials) {
      materials[i].skinning = true;
    }
    console.log(this);
    this.watchImages();
  }

  global.Chara.prototype = Object.create(new Object(), {
    moveChange: { value: moveChange },
    moveClossfade: { value: moveCrossfade },
    watchImages: { value: watchImages },
    update: { value: update }
  });

  /** モーション変更 */
  function moveChange(actionName) {
    var animations = this.mesh.geometry.animations;
    for (var i in animations) {
      this.mixer.clipAction(animations[i]).setEffectiveWeight(1).stop();
    }
    this.mixer.clipAction(actionName).setEffectiveWeight(1).play(0);
    this.move = actionName;
  }

  /** モーションをなめらかに接続する */
  // TODO: durationがモーションの長さに依存するのでどうにか秒に変更する
  function moveCrossfade(toActionName, duration) {
    var animations = this.mesh.geometry.animations;
    var fromAction = this.mixer.clipAction(this.move);
    var toAction = this.mixer.clipAction(toActionName);
    toAction.play(0);
    fromAction.crossFadeTo(toAction, duration);
    this.move = toActionName;
  }

  /** テクスチャの画像を更新する */
  function watchImages() {
    var _this = this;
    var materials = this.mesh.material.materials;
    var image;
    for (var i in materials) {
      var image = materials[i].map.image;
      // HACK: 読み込まれたら image が設定される
      if (image == null) {
        // TODO: 理想はTextureLoaderの中身監視だけど…あったら直す
        setTimeout(function() { _this.watchImages(); });
        return;
      }
    }
    if (_this.ready) _this.ready.call(_this);
  }

  /** キャラの動きを更新する */
  function update(delta) {
    this.state.update(delta);
    this.mixer.update(delta);
  }

}(this);

!function(global) {
  /** テクスチャのオフセットをずらす方式で表情を変える */
  global.Emotion = function(material) {
    this.material = material;
    this.emotions = [];
  }

  global.Emotion.prototype = Object.create(new Object(), {
    register: { value: register },
    change: { value: change }
  });

  /** 表情を登録する */
  function register(name, offsetX, offsetY) {
    var materials = this.material.materials;
    for (var i in materials) {
      if (materials[i].name == name) {
        this.emotions[name] = {
          x: offsetX,
          y: offsetY,
          texture: materials[i].map
        };
      }
    }
  }

  /** 表情を変える */
  function change(name, num) {
    var emotionInfo = this.emotions[name];
    var posX = 0, posY = 0;
    for (var i = 0; i < num; i ++) {
      posX += emotionInfo.x;
      if (posX + emotionInfo.x >= 1) {
        posX = 0;
        posY -= emotionInfo.y;
      }
    }
    emotionInfo.texture.offset.x = posX;
    emotionInfo.texture.offset.y = posY;
  }

}(this);

!function(global) {
  /** キャラの状態 */
  global.CharaState = function(target) {
    this.state = null;
    this.states = [];
    this.target = target;
    this.timers = [];
    this.elapsedTime = 0;
  }

  global.CharaState.prototype = Object.create(new Object(), {
    register: { value: register },
    change: { value: change },
    timer: { value: timer },
    update: { value: update }
  });

  /** ステートを登録 */
  function register(name, func) {
    this.states[name] = {
      func: func
    };
  }

  /** ステートを変更する */
  function change(name) {
    this.timers = [];
    this.elapsedTime = 0;

    this.state = this.states[name];
    this.state.func.call(this, this.target);
  }

  /** タイマーを設定する */
  function timer(time, func) {
    var setTime = time + this.elapsedTime;

    // 小さい順に入れることで取り出すときに楽になる
    var idx;
    for (idx = 0; idx < this.timers.length; idx++) {
      if (this.timers[idx].time > setTime) {
        break;
      }
    }
    this.timers.splice(idx, 0, {
      time: setTime,
      func: func
    });
  }

  /** ステートを更新する */
  function update(delta) {
    var state = this.state;
    this.elapsedTime += delta;

    // タイマー実行するためにタイマーの一覧を確認
    for (var i = 0; i < this.timers.length; i++) {
      if (this.timers[i].time > this.elapsedTime) {
        break;
      } else {
        this.timers[i].func.call(this, this.target);
        if (this.state != state) {
          // 状態が変わってたら他のはすべて取りやめ
          break;
        } else {
          // 一つ削除
          this.timers.shift();
          i--;
        }
      }
    }
  }

}(this);

!function(global) {
  global.Game = function(elem, modelPath) {
    this.elem = $(elem);
    // 画面
    this.screen = {
      width: 0,
      height: 0
    };

    this.clock = new THREE.Clock();

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    this.camera.position.set(0, .8, 3.5);
    this.camera.lookAt(new THREE.Vector3(0, .8, 0));
    this.scene.add(this.camera);

    // ライト
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);　　
    directionalLight.position.set(0, 60, -200);　　
    var ambientLight = new THREE.AmbientLight(0xffffff);　　
    this.scene.add(directionalLight, ambientLight);

    // レンダラー
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.setPixelRatio(window.devicePixelRatio? window.devicePixelRatio : 1);
    this.elem.append(this.renderer.domElement);

    this.updateSize();
    this.rendering();
  }

  Game.prototype = Object.create(new Object(), {
    rendering: { value: rendering },
    render: { value: render },
    updateSize: { value: updateSize }
  });

  function rendering() {
    if (this.render) this.render();
    this.renderer.render(this.scene, this.camera);

    var _this = this;
    requestAnimationFrame(function() { _this.rendering(); }, this.renderer.domElement);
  }

  function render() {
    // empty
  }

  function updateSize() {
    this.screen.width = this.elem.width();
    this.screen.height = this.elem.height();

    this.camera.aspect = this.screen.width / this.screen.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.screen.width, this.screen.height);
  }

}(this);

!function(global) {
  global.DragController = function(elem, camera, lookAt) {
    this.camera = camera;
    this.lookAt = lookAt;
    this.speed = 0.3;

    this.dragX = 0;
    this.dragY = 0;
    this.cameraLength = 3.5;
    this.pitch = 0;
    this.yaw = 0;

    var self = this;

    this.mouseDown = false;
    $(elem).on('mousedown', function(e) {
      self.mouseDown = true;
      self.dragStart(e.pageX, e.pageY);
      e.preventDefault();
    });
    $(document).on('mouseup', function(e) {
      self.mouseDown = false;
      e.preventDefault();
    });
    $(document).on('mousemove', function(e) {
      if (self.mouseDown) {
        self.dragMove(e.pageX, e.pageY);
        e.preventDefault();
      }
    });
    $(elem).on('touchstart', function(e) {
      var touch = e.targetTouches[0];
      self.dragStart(touch.pageX, touch.pageY);
      e.preventDefault();
    });
    $(elem).on('touchmove', function(e) {
      if (e.targetTouches.length == 1) {
        var touch = e.targetTouches[0];
        self.dragMove(touch.pageX, touch.pageY);
        e.preventDefault();
      }
    });
  };

  global.DragController.prototype = Object.create(new Object(), {
    dragStart: { value: dragStart },
    dragMove: { value: dragMove }
  });

  function dragStart(x, y) {
    this.dragX = x;
    this.dragY = y;
  }

  function dragMove(x, y) {
    var deltaX = (x - this.dragX) * this.speed;
    var deltaY = (y - this.dragY) * this.speed;
    this.dragX = x;
    this.dragY = y;

    this.pitch -= deltaX / 180 * Math.PI;
    this.yaw += deltaY / 180 * Math.PI;

    if (this.yaw < -70 / 180 * Math.PI) this.yaw = -70 / 180 * Math.PI;
    if (this.yaw > 70 / 180 * Math.PI) this.yaw = 70 / 180 * Math.PI

    this.camera.position.y = this.lookAt.y + Math.sin(this.yaw) * this.cameraLength
    this.camera.position.x = this.lookAt.x + Math.sin(this.pitch) * Math.cos(this.yaw) * this.cameraLength;
    this.camera.position.z = this.lookAt.z + Math.cos(this.pitch) * Math.cos(this.yaw)* this.cameraLength;
    this.camera.lookAt(this.lookAt);
  }
}(this);
