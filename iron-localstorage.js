/**
@license
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/
import {Polymer} from '@polymer/polymer/lib/legacy/polymer-fn.js';
import {Base} from '@polymer/polymer/polymer-legacy.js';

/**
Element access to Web Storage API (window.localStorage).

Keeps `value` property in sync with localStorage.

Value is saved as json by default.

### Usage:

`ls-sample` will automatically save changes to its value.
    import {PolymerElement, html} from '@polymer/polymer';

    class LsSample extends PolymerElement {
      static get template() {
        return html`
          <iron-localstorage
              name="my-app-storage"
              value="{{cartoon}}"
              on-iron-localstorage-load-empty="initializeDefaultCartoon">
          </iron-localstorage>
        `;
      }

      static get properties() {
        return {
          cartoon: {
            type: Object
          }
        }
      }

      // initializes default if nothing has been stored
      initializeDefaultCartoon() {
        this.cartoon = {
          name: "Mickey",
          hasEars: true
        }
      }

      // use path set api to propagate changes to localstorage
      makeModifications() {
        this.set('cartoon.name', "Minions");
        this.set('cartoon.hasEars', false);
      }
    }

    customElements.define('ls-sample', LsSample);

### Tech notes:

* * `value.*` is observed, and saved on modifications. You must use
    path change notification methods such as `set()` to modify value
    for changes to be observed.

* * Set `auto-save-disabled` to prevent automatic saving.

* * Value is saved as JSON by default.

* * To delete a key, set value to null

* Element listens to StorageAPI `storage` event, and will reload upon receiving
it.

@demo demo/index.html
*/
Polymer({
  is: 'iron-localstorage',

  properties: {
    /**
     * localStorage item key
     */
    name: {
      type: String,
      value: '',
    },
    /**
     * The data associated with this storage.
     * If set to null item will be deleted.
     * @type {*}
     */
    value: {
      type: Object,
      notify: true,
    },

    /**
     * If true: do not convert value to JSON on save/load
     */
    useRaw: {
      type: Boolean,
      value: false,
    },

    /**
     * Value will not be saved automatically if true. You'll have to do it
     * manually with `save()`
     */
    autoSaveDisabled: {
      type: Boolean,
      value: false,
    },
    /**
     * Last error encountered while saving/loading items
     */
    errorMessage: {
      type: String,
      notify: true,
    },

    /** True if value has been loaded */
    _loaded: {
      type: Boolean,
      value: false,
    }
  },

  observers: [
    '_debounceReload(name,useRaw)',
    '_trySaveValue(autoSaveDisabled)',
    '_trySaveValue(value.*)',
  ],

  /** @override */
  _template: null,

  /** @override */
  ready: function() {
    this._boundHandleStorage = this._handleStorage.bind(this);
  },

  /** @override */
  attached: function() {
    window.addEventListener('storage', this._boundHandleStorage);
  },

  /** @override */
  detached: function() {
    window.removeEventListener('storage', this._boundHandleStorage);
  },

  _handleStorage: function(ev) {
    if (ev.key == this.name) {
      this._load(true);
    }
  },

  _trySaveValue: function() {
    if (this.autoSaveDisabled === undefined || this._doNotSave) {
      return;
    }

    if (this._loaded && !this.autoSaveDisabled) {
      this.debounce('save', this.save);
    }
  },

  _debounceReload: function() {
    if (this.name !== undefined && this.useRaw !== undefined) {
      this.debounce('reload', this.reload);
    }
  },

  /**
   * Loads the value again. Use if you modify
   * localStorage using DOM calls, and want to
   * keep this element in sync.
   */
  reload: function() {
    this._loaded = false;
    this._load();
  },

  /**
   * loads value from local storage
   * @param {boolean=} externalChange true if loading changes from a different window
   */
  _load: function(externalChange) {
    try {
      var v = window.localStorage.getItem(this.name);
    } catch (ex) {
      this.errorMessage = ex.message;

      this._error(
          'Could not save to localStorage.  Try enabling cookies for this page.',
          ex);
    };

    if (v === null) {
      this._loaded = true;
      this._doNotSave = true;  // guard for save watchers
      this.value = null;
      this._doNotSave = false;
      this.fire(
          'iron-localstorage-load-empty',
          {externalChange: externalChange},
          {composed: true});
    } else {
      if (!this.useRaw) {
        try {  // parse value as JSON
          v = JSON.parse(v);
        } catch (x) {
          this.errorMessage = 'Could not parse local storage value';
          Base._error('could not parse local storage value', v);
          v = null;
        }
      }
      this._loaded = true;
      this._doNotSave = true;
      this.value = v;
      this._doNotSave = false;
      this.fire('iron-localstorage-load', {externalChange: externalChange}, {
        composed: true
      });
    }
  },

  /**
   * Saves the value to localStorage. Call to save if autoSaveDisabled is set.
   * If `value` is null or undefined, deletes localStorage.
   * @override
   */
  save: function() {
    var v = this.useRaw ? this.value : JSON.stringify(this.value);
    try {
      if (this.value === null || this.value === undefined) {
        window.localStorage.removeItem(this.name);
      } else {
        window.localStorage.setItem(this.name, /** @type {string} */ (v));
      }
    } catch (ex) {
      // Happens in Safari incognito mode,
      this.errorMessage = ex.message;
      Base._error(
          'Could not save to localStorage. Incognito mode may be blocking this action',
          ex);
    }
  }

  /**
   * Fired when value loads from localStorage.
   *
   * @event iron-localstorage-load
   * @param {{externalChange:boolean}} detail -
   *     externalChange: true if change occured in different window.
   */

  /**
   * Fired when loaded value does not exist.
   * Event handler can be used to initialize default value.
   *
   * @event iron-localstorage-load-empty
   * @param {{externalChange:boolean}} detail -
   *     externalChange: true if change occured in different window.
   */
});
