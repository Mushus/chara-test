"use strict";

var Chara = function(mesh) {
  var self = this;

  this.mesh = mesh;
  this.emotion = new Emotion(mesh.material);
  this.mixer = new THREE.AnimationMixer(mesh);
  this.state = new CharaState(this);
  this._ready = null;
  this.move = null;
  var materials = mesh.material.materials;
  for (var i in materials) {
    materials[i].skinning = true;
  }
  this.watchImages();
}

Chara.prototype = {
  moveChange: function(actionName) {
    var animations = this.mesh.geometry.animations;
    for (var i in animations) {
      this.mixer.clipAction(animations[i]).setEffectiveWeight(1).stop();
    }
    this.mixer.clipAction(actionName).setEffectiveWeight(1).play(0);
    this.move = actionName;
  },
  moveClossfade: function(toActionName, duration) {
    var animations = this.mesh.geometry.animations;
    var fromAction = this.mixer.clipAction(this.move)
    var toAction = this.mixer.clipAction(toActionName);
    toAction.play(0);
    fromAction.crossFadeTo(toAction, duration);

    this.move = toActionName;
  },
  ready: function(func) {
    this._ready = func;
  },
  watchImages: function() {
    var self = this;
    var materials = this.mesh.material.materials;
    for (var i in materials) {
      var image = materials[i].map.image;
      if (image == null) {
        setTimeout(function() { self.watchImages(); });
        return;
      }
    }
    if (self._ready) self._ready.call(self);
  },
  update: function(delta) {
    this.state.update(delta);
    this.mixer.update(delta);
  }
};

var Emotion = function(material) {
  this.material = material;
  this.emotions = [];
}

Emotion.prototype = {
  /** 表情情報登録 */
  register: function(name, offsetX, offsetY) {
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
  },

  /** 表情を変える */
  change: function(name, num) {
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
};
var CharaState = function(target) {
  this.state = null;
  this.states = [];
  this.target = target;
  this.timers = [];
  this.elapsedTime = 0;
}

CharaState.prototype = {
  register: function(name, func) {
    this.states[name] = {
      func: func
    };
  },
  change: function(name) {
    this.timers = [];
    this.elapsedTime = 0;

    this.state = this.states[name];
    this.state.func.call(this, this.target);
  },
  timer: function(time, func) {
    var setTime = time + this.elapsedTime;

    // 小さい順に入れる
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
  },
  update: function(delta) {
    var state = this.state;
    this.elapsedTime += delta;

    for (var i = 0; i < this.timers.length; i++) {
      if (this.timers[i].time > this.elapsedTime) {
        break;
      } else {
        this.timers[i].func.call(this, this.target);
        if (this.state != state) {
          break;
        } else {
          this.timers.shift();
          i--;
        }
      }
    }
  }
};

var Game = function(elem, modelPath) {
  var self = this;
  this.elem = $(elem);
  // キャラクタ
  this.chara = null;
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

  // モデルローダー
  var loader = new THREE.JSONLoader();
  loader.load(modelPath, function(get, mat) {
    self.chara = self.loadChara(get, mat);
  });

  this.updateSize();
  this.rendering();
}

Game.prototype = {
  // レンダリングループ
  rendering: function() {
    var delta = this.clock.getDelta();
    if (this.chara) {
      this.chara.update(delta);
    }
    this.renderer.render(this.scene, this.camera);

    var self = this;
    requestAnimationFrame(function() { self.rendering(); }, this.renderer.domElement);
  },
  // ロードする
  loadChara: function(geo, mat) {
    var material = new THREE.MultiMaterial(mat);
    var mesh = new THREE.SkinnedMesh(geo, material);
    this.scene.add(mesh);

    var chara = new Chara(mesh);

    chara.emotion.register('mouth', 120 / 512, 80 / 512);
    chara.emotion.register('eye', 100 / 512, 100 / 512);
    chara.emotion.register('cheek', 160 / 512, 160 / 512);

    chara.state.register('idle', function(chara) {
      if (chara.move != 'idle') {
        console.log(chara.move)
        chara.moveChange('idle');
      }
    });
    chara.state.register('shake_hand', function(chara) {
      chara.moveChange('shake_hand');
      this.timer(25 / 24, function() {
        chara.moveClossfade('idle', 8/33);
      });
      this.timer(33 / 24, function() {
        this.change('idle');
      });
    });
    chara.state.register('nono', function(chara) {
      chara.moveChange('nono');
      this.timer(42 / 24, function() {
        chara.moveClossfade('idle', 8/50);
      });
      this.timer(50 / 24, function() {
        this.change('idle');
      });
    });
    chara.state.register('yeah', function(chara) {
      chara.moveChange('yeah');
      this.timer(36 / 24, function() {
        chara.moveClossfade('idle', 8/44);
      });
      this.timer(44 / 24, function() {
        this.change('idle');
      });
    });

    chara.ready(function() {
      this.state.change('shake_hand');
    });

    return chara;
  },

  updateSize: function() {
    this.screen.width = this.elem.width();
    this.screen.height = this.elem.height();

    this.camera.aspect = this.screen.width / this.screen.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.screen.width, this.screen.height);
  }
};

var DragController = function(elem, camera, lookAt) {
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

DragController.prototype = {
  dragStart: function(x, y) {
    this.dragX = x;
    this.dragY = y;
  },
  dragMove: function(x, y) {
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
};
