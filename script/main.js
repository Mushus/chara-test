!function(global) {
  "use strict";

  global.Main = function(elem, modelPath) {
    Game.call(this, elem, modelPath);

    var _this = this;
    // モデルローダー
    var loader = new THREE.JSONLoader();
    loader.load(modelPath, function(geo, mat) {
      var material = new THREE.MultiMaterial(mat);
      var mesh = new THREE.SkinnedMesh(geo, material);
      _this.scene.add(mesh);

      _this.chara = _this.loadChara(mesh);
    });
  }

  global.Main.prototype = Object.create(Game.prototype, {
    loadChara: { value: loadChara },
    render: { value: render }
  });

  /** キャラの読み込み */
  function loadChara(mesh) {
      var chara = new Chara(mesh);

      // エモーション
      chara.emotion.register('mouth', 120 / 512, 80 / 512);
      chara.emotion.register('eye', 100 / 512, 100 / 512);
      chara.emotion.register('cheek', 160 / 512, 160 / 512);

      // モーションをどう動かすかとか
      chara.state.register('idle', function(chara) {
        if (chara.move != 'idle') {
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
      chara.state.register('huh', function(chara) {
        chara.moveChange('huh');
        this.timer(40 / 24, function() {
          chara.moveClossfade('idle', 15/55);
        });
        this.timer(55 / 24, function() {
          this.change('idle');
        });
      });

      // 読み込み終わったら手を振る
      chara.ready = function() {
        $('#view3d .nowloaing').hide();
        this.state.change('shake_hand');
      };

      return chara;
  }

  // レンダリングする
  function render() {
    var delta = this.clock.getDelta();
    if (this.chara) {
      this.chara.update(delta);
    }
  }

}(this);
