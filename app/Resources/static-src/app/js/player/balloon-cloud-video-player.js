import Emitter from 'component-emitter';
class BalloonCloudVideoPlayer extends Emitter {

  constructor(options) {
    super();
    this.options = options;
    this.player = {};
    this.playerVersion = 'v2' === options.playerVersion ? 'v2' : 'v1';
    this.currentTime = 0;
    this.playing = false;
    this.setup();
  }

  setup() {
    let element = this.options.element;

    var self = this;

    let extConfig = {};

    //字幕（新版播放器根据 resNo 自动获取字幕，无需透传）
    if ('v1' === this.playerVersion && self.options.textTrack && self.options.textTrack.length) {
      extConfig = Object.assign(extConfig, {
        textTrack: self.options.textTrack
      });
    }

    if (self.options.watermark) {
      extConfig = Object.assign(extConfig, {
        watermark: {
          file: self.options.watermark,
          pos: 'top.right', //top.right, bottom.right, bottom.left, center
          xrepeat: 0,
          opacity: 0.5
        }
      });
    }

    if (self.options.fingerprint) {
      extConfig = Object.assign(extConfig, {
        fingerprint: {
          html: self.options.fingerprint,
          duration: self.options.fingerprintTime
        }
      });
    }

    if (self.options.timelimit) {
      extConfig = Object.assign(extConfig, {
        pluck: {
          timelimit: self.options.timelimit,
          text: Translator.trans('activity.video.try_watch_finish_hint'),
          display: true
        }
      });
    }

    if (self.options.enablePlaybackRates) {
      extConfig = Object.assign(extConfig, {
        playbackRates: ['0.5', '1.0', '1.25', '1.5', '2.0']
      });
    }

    if (self.options.videoH5) {
      extConfig = Object.assign(extConfig, {
        h5: true
      });
    }

    if (self.options.controlBar) {
      extConfig = Object.assign(extConfig, {
        controlBar: self.options.controlBar
      });
    }

    const lang = (document.documentElement.lang == 'zh_CN') ? 'zh-CN' : document.documentElement.lang;
    self.options.customPos = self.options.customPos.toString();

    var player;

    if ('v2' === this.playerVersion) {
      extConfig = Object.assign(extConfig, {
        id: $(self.options.element).attr('id'),
        resNo: self.options.resNo,
        token: self.options.token,
        user: self.transToUser(self.options.statsInfo),
        disableDataUpload: app.cloudDisableLogReport,
        disableSentry: app.cloudDisableLogReport,
        disableControlBar: self.options.disableControlBar,
        disableProgressBar: self.options.disableProgressBar,
        disableFullscreen: self.options.disableFullscreen,
        disableSeek: self.options.disableProgressBar ? 'forward' : 'none',
        rememberLastPos: (self.options.customPos && self.options.remeberLastPos) ? true : false,
        initPos: self.options.customPos,
        autoplay: self.options.autoplay,
        strictMode: !self.options.strictMode,
        language: lang
      });

      if (app.cloudSdkBaseUri) {
        extConfig.sdkBaseUri = app.cloudSdkBaseUri;
      }

      player = new QiQiuYun.Player(extConfig);
    } else {
      if (self.options.statsInfo) {
        var statsInfo = self.options.statsInfo;
        extConfig = Object.assign(extConfig, {
          statsInfo: {
            accesskey: statsInfo.accesskey,
            globalId: statsInfo.globalId,
            userId: statsInfo.userId,
            userName: statsInfo.userName
          }
        });
      }

      const remeberLastPos = (self.options.customPos && self.options.remeberLastPos) ? true : false;

      extConfig = Object.assign(extConfig, {
        id: $(self.options.element).attr('id'),
        sdkBaseUri: app.cloudSdkBaseUri,
        disableDataUpload: app.cloudDisableLogReport,
        disableSentry: app.cloudDisableLogReport,
        disableControlBar: self.options.disableControlBar,
        disableProgressBar: self.options.disableProgressBar,
        playlist: self.options.url,
        remeberLastPos: remeberLastPos,
        customPos: self.options.customPos,
        videoHeaderLength: self.options.videoHeaderLength,
        autoplay: self.options.autoplay,
        strictMode: !self.options.strictMode,
        language: lang
      });

      player = new VideoPlayerSDK(extConfig);
    }

    player.on('ready', function(e) {
      self.emit('ready', e);
    });

    player.on('timeupdate', function(e) {
      //    player.__events get all the event;
      self.currentTime = e && e.currentTime ? e.currentTime : self.currentTime;
      self.emit('timechange', e);
    });

    player.on('firstplay', function (e) {
      player.setCurrentTime(self.options.customPos);
    });

    player.on('unableConfirm', function (e) {
      var backLink = $('.js-back-link', parent.document)[0];
      if (backLink) {
        backLink.click();
      }
    });

    player.on('ended', function(e) {
      self.playing = false;
      self.emit('ended', e);
    });

    player.on('playing', function(e) {
      self.playing = true;
      self.emit('playing', e);
    });

    player.on('paused', function(e) {
      self.playing = false;
      self.emit('paused', e);
    });

    player.on('exam.answered', function(e) {
      var data = (e && e.data) ? e.data : e;
      data['type'] = self.convertQuestionType(data.type, 'cloud');
      self.emit('answered', data);
    });

    this.player = player;
  }

  transToUser(statsInfo) {
    var user = {};
    if (!statsInfo) {
      return user;
    }

    user = {
      accesskey: statsInfo.accesskey,
      globalId: statsInfo.globalId,
      id: statsInfo.userId,
      name: statsInfo.userName,
      userId: statsInfo.userId,
      userName: statsInfo.userName
    };

    return user;
  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  getCurrentTime() {
    var time = (this.player && 'function' == typeof this.player.getCurrentTime) ? this.player.getCurrentTime() : this.currentTime;
    return time || 0;
  }

  setCurrentTime(time) {
    this.player.setCurrentTime(time);
    return this;
  }

  replay() {
    this.setCurrentTime(0).play();
    return this;
  }

  isPlaying() {
    if ('v2' === this.playerVersion) {
      return !!this.playing;
    }
    if (this.player && this.player.paused) {
      return !this.player.paused();
    }
    return false;
  }

  setQuestions(questions) {

    if (questions.length > 0) {

      for (var i in questions) {
        questions[i]['type'] = this.convertQuestionType(questions[i].type, 'es');
      }

      var exam = {
        popupExam: {
          config: {
            'mode': 'middle'
          },
          questions: questions
        }
      };

      this.player.setExams(exam);
    }

    return this;
  }

  convertQuestionType(source, from) {
    var map = [ //云播放器弹题的字段值跟ES不太一致
      {
        es: 'choice',
        cloud: 'multiChoice'
      }, {
        es: 'single_choice',
        cloud: 'choice'
      }, {
        es: 'determine',
        cloud: 'judge'
      }, {
        es: 'fill',
        cloud: 'completion'
      }, {
        es: 'uncertain_choice',
        cloud: 'uncertainChoice'
      }
    ];

    for (var i in map) {
      if (from == 'es' && map[i]['es'] == source) {
        return map[i]['cloud'];
      }
      if (from == 'cloud' && map[i]['cloud'] == source) {
        return map[i]['es'];
      }
    }

    return source;
  }

}

export default BalloonCloudVideoPlayer;
