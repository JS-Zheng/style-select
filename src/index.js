import Vue from 'vue/dist/vue.esm'
import Cookies from 'js-cookie'


var env = process.env;
console.log(`==== ${env.NAME} ${env.NODE_ENV} v${env.VERSION} ====`);

export default {
  createStyleGroup: function (groupId, hintText = '--please choose--', cssPrefix = 'style-select', supportNoneStyle = true) {

    let isTmpGroup = false;
    if (!groupId) {
      groupId = getSimpleStr();
      isTmpGroup = true;
    }

    /*
     * Provide shared information and their basic methods.
     *
     * StylesList Structure Demo:
     * (each element called: styles)
     * ----------------------------
     * {
     *   "stylesList": [
     *     {
     *       "baseUrl": "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/",
     *       "names": [
     *         "pink",
     *         "blue"
     *       ],
     *       "supportMinCss": true
     *     },
     *     {
     *       "baseUrl": "style/",
     *       "names": [
     *         "bootstrap",
     *         "agate"
     *       ],
     *       "supportMinCss": true
     *     }
     *   ]
     * }
     *
     */
    let vm = new Vue({
      data: {
        cookie: {
          expires: 7,
          path: '/'
        },
        state: {
          groupId,
          isTmpGroup, // If it is a temporary Id, no data will be stored.
          cssPrefix,
          hintText,
          supportNoneStyle,
          stylesList: [], // public shared stylesList
          currentStyle: null,
          defaultStyle: null,
          hasCookieRecord: false
        }
      },
      computed: {
        currentStyleName: function () {
          return this.state.currentStyle ? this.state.currentStyle.name : null;
        },
        cookieName: function () {
          return this.state.cssPrefix + '-' + this.state.groupId;
        },
        targetHref: function () {
          let style = this.state.currentStyle;
          if (!style) return null;

          return style.baseUrl + style.name
            + (style.supportMinCss ? '.min' : '' ) + '.css';
        },
        linkId: function () {
          // Prevent id duplication
          return getSimpleStr(5) + '-' + this.state.groupId;
        }
      },
      methods: {
        setCookieOptions(expires, path = '/') {
          this.cookie.expires = expires;
          this.cookie.path = path;
        },
        setStyle(style) {
          this.state.currentStyle = style;
          this.loadStyle(style);

          if (!this.state.isTmpGroup)
            this.storeStyleState(this.cookieName, style);
        },
        storeStyleState(cName, style) {
          Cookies.set(cName, style,
            {
              expires: this.cookie.expires,
              path: this.cookie.path
            });
        },
        addStyles(baseUrl, names, supportMinCss = false) {
          return addStyles(this.state.stylesList, baseUrl, names, supportMinCss);
        },
        removeStyle(baseUrl, name) {
          return removeStyle(this.state.stylesList, baseUrl, name);
        },
        setDefaultStyle(baseUrl, name, supportMinCss = false) {
          if (!isUndefined(baseUrl) && !isUndefined(name)) {
            let style = {baseUrl: filterBaseUrl(baseUrl), name, supportMinCss};
            this.state.defaultStyle = style;

            if (!this.state.hasCookieRecord)
              this.setStyle(style);

            addStyles(this.state.stylesList, baseUrl, [name], supportMinCss);
          }
        },
        removeCookie() {
          let cookieName = this.cookieName;
          Cookies.remove(cookieName);
        },
        addSeparator(length) {
          addSeparator(length, this.state.stylesList);
        },
        addText(text) {
          addText(text, this.state.stylesList);
        },
        createSelect(el) {
          return new StyleSelect().$mount(el);
        },
        loadStyle(style) {
          let link = this.link(this.linkId);

          if (!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.id = this.linkId;
            document.querySelector('head').appendChild(link);
          }

          if (style) {
            link.disabled = false;
            link.href = this.targetHref;
          } else {
            link.disabled = true;
          }
        },
        link(linkId) {
          return document.querySelector('#' + linkId);
        }
      },
      created: function () {
        if (this.state.isTmpGroup)
          return;

        let cookieName = this.cookieName;
        let style = Cookies.getJSON(cookieName);

        // Allow load null style.
        if (!isUndefined(style)) {
          this.state.hasCookieRecord = true;
          this.setStyle(style);
        }
      }
    });

    // The constructor of VueJS.
    let StyleSelect = Vue.extend({
      data: function () {
        return {
          privateStylesList: [],
          compareFunction: null,
          sharedState: vm.state
        }
      },
      computed: {
        // Don't concat public & private lists directly, which leads to duplicate style issues.
        stylesList: function () {
          // Only getter
          let totalStylesList = this.privateStylesList.slice(); // The order of the private list is prioritized.

          for (let i = this.sharedState.stylesList.length - 1; i > -1; i--) {
            const styles = this.sharedState.stylesList[i];
            if (styles.disabled)
              totalStylesList.unshift(styles);
            else
              addStyles(totalStylesList, styles.baseUrl, styles.names, styles.supportMinCss, false);
          }

          if (this.compareFunction) {
            var oneDimensionStylesList = this.toOneDimensionStylesList(totalStylesList);
            return oneDimensionStylesList.sort(this.compareFunction);
          } else {
            return totalStylesList;
          }
        },
        selected: {
          get: function () {
            let currentStyle = this.sharedState.currentStyle;

            // option text: --please choose--
            if (!currentStyle)
              return '';

            // Traverse StylesList
            for (let i = 0; i < this.stylesList.length; i++) {
              let styles = this.stylesList[i];

              if (styles.baseUrl !== currentStyle.baseUrl)
                continue;

              // Traverse the name of Styles
              for (let j = 0; j < styles.names.length; j++) {
                let name = styles.names[j];
                if (name === currentStyle.name)
                  return i + '-' + j;
              }
            }

            // currentStyle is exist, but the select doesn't have this option.
            // option text: (empty)
            return null;
          },
          set: function (val) {
            if (!val) {
              if (val === '') this.onNoSelected();
              return;
            }

            let indexes = val.split('-');
            if (indexes.length < 2) return;

            this.onSelected(indexes[0], indexes[1]);
          }
        },
        className: function () {
          let prefix = this.sharedState.cssPrefix;
          return (prefix ? prefix + '-' : '') + this.sharedState.groupId;
        }
      },
      // Use Template literals
      template: `
    <select
            v-model="selected"
            :name="className"
            :class="[className, 'style-select']"
    >
      <option value="" :disabled="!sharedState.supportNoneStyle">{{sharedState.hintText}}</option>
      <template v-for="(styles, stylesIndex) in stylesList">
        <option
          v-for="(name, index) in styles.names"
          :key="stylesIndex+'-'+index" 
          :value="stylesIndex+'-'+index"
          :disabled="styles.disabled">
              {{name}}
        </option>
      </template>
    </select>`
    });


    StyleSelect.prototype.onSelected = function (listIndex, styleIndex) {
      let styles = this.stylesList[listIndex];
      let s = {
        baseUrl: styles.baseUrl,
        name: styles["names"][styleIndex],
        supportMinCss: styles.supportMinCss
      };

      // Notify the status change, rather than directly change it.
      vm.setStyle(s);
    };

    StyleSelect.prototype.onNoSelected = function () {
      vm.setStyle(null);
    };

    StyleSelect.prototype.addStyles = function (baseUrl, names, supportMinCss = false) {
      return addStyles(this.privateStylesList, baseUrl, names, supportMinCss);
    };

    StyleSelect.prototype.addSeparator = function (length) {
      addSeparator(length, this.privateStylesList);
    };

    StyleSelect.prototype.addText = function (text) {
      addText(text, this.privateStylesList);
    };

    StyleSelect.prototype.removeStyle = function (baseUrl, name) {
      // Prevent to use stylesList.
      return removeStyle(this.privateStylesList, baseUrl, name);
    };

    // Wasting space, but conducive to sorting.
    StyleSelect.prototype.toOneDimensionStylesList = function (stylesList) {
      let result = [];
      for (let i = 0, styles; styles = stylesList[i]; i++) {

        if (styles.disabled) {
          result.push(styles);
          continue;
        }
        for (let j = 0, name; name = styles.names[j]; j++) {
          let newStyle = {baseUrl: styles.baseUrl, names: [name], supportMinCss: styles.supportMinCss};
          result.push(newStyle);
        }
      }
      return result;
    };

    StyleSelect.prototype.moveIndex = function (increment = true) {

      let currentIndex = this.selected;
      if (currentIndex === null) return;

      let result;
      let indexes = currentIndex ? currentIndex.split('-')
        : (increment ? [0, -1] : [this.stylesList.length, 0]);

      let i = indexes[0];
      let j = indexes[1];
      let styles = this.stylesList[i];

      increment ? j++ : j--;

      if (j < 0 || j >= styles.names.length || this.stylesList[i].disabled) {

        do {
          increment ? i++ : i--;

          styles = this.stylesList[i];

          // Filter index-i
          if (!styles || styles.disabled || !styles.names) continue;

          j = increment ? 0 : styles.names.length - 1;

          // i > -1 may cause overflow, can prevent 0-0 item is disabled.
        } while (i > -1 && i < this.stylesList.length && this.stylesList[i].disabled);
      }

      // Careful addition of string and number.
      if (i > -1 && i < this.stylesList.length)
        result = Number(i) + '-' + Number(j);
      else
        result = '';

      this.selected = result;
    };


    // To support the public and private stylesList, so pulled out these function.
    function filterDuplicateStyle(stylesList, baseUrl, names) {
      let buffer = {};

      for (let i = 0, styles; styles = stylesList[i]; i++) {

        if (styles.disabled || styles.baseUrl !== baseUrl) continue;

        for (let j = 0, sName; sName = styles.names[j]; j++)
          buffer[sName] = true;
      }

      return names.filter(function (name) {
        return !buffer.hasOwnProperty(name);
      });
    }

    // @returns {boolean} Returns true if successful, false otherwise.
    function addStyles(stylesList, baseUrl, names, supportMinCss = false, push = true) {
      if (isUndefined(baseUrl) || isUndefined(names) || !Array.isArray(names)) return false;

      baseUrl = filterBaseUrl(baseUrl);

      // Filter duplicate style
      let uniqueNames = filterDuplicateStyle(stylesList, baseUrl, names);

      // To prevent add empty styles.
      if (uniqueNames.length < 1) return false;

      let styles = {baseUrl, names: uniqueNames, supportMinCss};

      push ? stylesList.push(styles) : stylesList.unshift(styles);

      return true;
    }

    function addSeparator(length = 6, stylesList) {
      let text = '';
      for (let i = 0; i < length; i++) text += '─';
      addText(text, stylesList);
    }


    function addText(text, stylesList) {
      let textOption = {names: [text], disabled: true};
      stylesList.push(textOption);
    }

    // @returns {boolean} Returns true if successful, false otherwise.
    function removeStyle(stylesList, baseUrl = '*', name) {
      if (isUndefined(stylesList) || isUndefined(name) || !name)
        return false;

      if (baseUrl !== '*') baseUrl = filterBaseUrl(baseUrl);
      let listLength = stylesList.length;
      if (listLength < 1) return false;

      let result = false;

      for (let i = 0, styles; styles = stylesList[i]; i++) {

        if (styles.disabled || (baseUrl !== styles.baseUrl && baseUrl !== '*')) continue;

        for (let j = 0, sName; sName = styles.names[j]; j++) {
          if (name === sName) {
            styles.names.splice(j, 1);
            result = true;
            j--;

            let currentStyle = vm.state.currentStyle;
            let defaultStyle = vm.state.defaultStyle;

            if (defaultStyle && defaultStyle.name === name) {
              defaultStyle = vm.state.defaultStyle = null;
            }

            if (currentStyle && currentStyle.name === name) {
              vm.setStyle(defaultStyle ? defaultStyle : null);
            }
          }
        }

        // If styles is empty.
        if (styles.names.length < 1) {
          stylesList.splice(i, 1);
          i--;
        }
      }

      return result;
    }

    // Simple Utils.
    function isUndefined(obj) {
      return typeof obj === 'undefined';
    }

    function getSimpleStr(length = 5) {
      let text = "";
      let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

      for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }

    function filterBaseUrl(baseUrl) {
      return baseUrl === '' || baseUrl.slice(-1) === '/' ? baseUrl : baseUrl + '/';
    }

    return vm;
  }
}