"use strict";

var Chara = function(mesh) {
  this.mesh = mesh;
  this.emotion = new Emotion(mesh.material);
}

Chara.prototype = {
};

var Emotion = function(material) {
  this.material = material;
  this.emotions = [];
}

Emotion.prototype = {
  /** 表情情報登録 */
  register: function(name, offsetX, offsetY) {
    var materials = this.material.materials;
    for(var i in materials) {
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
    for(var i = 0; i < num; i ++) {
      posX += emotionInfo.x;
      if (posX >= 1) {
        posX = 0;
        posY += emotionInfo.y;
      }
    }
    emotionInfo.texture.offset.x = posX;
    emotionInfo.texture.offset.y = posY;
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

  // シーン
  this.scene = new THREE.Scene();

  // カメラ
  this.camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
  this.camera.position.set(0, .8, 3);
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
    chara.emotion.register("mouth", 120 / 512, 80 / 512);
    chara.emotion.register("eye", 100 / 512, 100 / 512);
    chara.emotion.register("cheek", 160 / 512, 160 / 512);

    return chara;
  },

  changeFaceOffset: function(x, y) {
    var texture = this.chara.material.materials[1].map;
    var uvOffset = texture.offset;
    uvOffset.x = x;
    uvOffset.y = y;
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
  this.cameraLength = 3;
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
