export class IVCSProvider {
  name = '';
  version = '1.0.0';
  description = '';

  async detect() {
    throw new Error('IVCSProvider.detect() must be implemented');
  }

  async init(_path, _opts) {
    throw new Error('IVCSProvider.init() must be implemented');
  }

  async clone(_url, _path, _opts) {
    throw new Error('IVCSProvider.clone() must be implemented');
  }

  async checkout(_ref, _opts) {
    throw new Error('IVCSProvider.checkout() must be implemented');
  }

  async commit(_message, _opts) {
    throw new Error('IVCSProvider.commit() must be implemented');
  }

  async push(_remote, _opts) {
    throw new Error('IVCSProvider.push() must be implemented');
  }

  async pull(_remote, _opts) {
    throw new Error('IVCSProvider.pull() must be implemented');
  }

  async merge(_source, _target, _opts) {
    throw new Error('IVCSProvider.merge() must be implemented');
  }

  async branch(_name, _opts) {
    throw new Error('IVCSProvider.branch() must be implemented');
  }

  async tag(_name, _message, _opts) {
    throw new Error('IVCSProvider.tag() must be implemented');
  }

  async status(_opts) {
    throw new Error('IVCSProvider.status() must be implemented');
  }

  async log(_opts) {
    throw new Error('IVCSProvider.log() must be implemented');
  }

  async diff(_from, _to, _opts) {
    throw new Error('IVCSProvider.diff() must be implemented');
  }

  async addRemote(_name, _url, _opts) {
    throw new Error('IVCSProvider.addRemote() must be implemented');
  }

  getCapabilities() {
    return [
      'init',
      'clone',
      'checkout',
      'commit',
      'push',
      'pull',
      'merge',
      'branch',
      'tag',
      'status',
      'log',
      'diff',
      'addRemote',
    ];
  }
}
