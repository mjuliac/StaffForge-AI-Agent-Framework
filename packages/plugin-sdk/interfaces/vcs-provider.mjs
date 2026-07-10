export class IVCSProvider {
  name = '';
  version = '1.0.0';
  description = '';

  async detect() {
    throw new Error('IVCSProvider.detect() must be implemented');
  }

  async init(path, opts) {
    throw new Error('IVCSProvider.init() must be implemented');
  }

  async clone(url, path, opts) {
    throw new Error('IVCSProvider.clone() must be implemented');
  }

  async checkout(ref, opts) {
    throw new Error('IVCSProvider.checkout() must be implemented');
  }

  async commit(message, opts) {
    throw new Error('IVCSProvider.commit() must be implemented');
  }

  async push(remote, opts) {
    throw new Error('IVCSProvider.push() must be implemented');
  }

  async pull(remote, opts) {
    throw new Error('IVCSProvider.pull() must be implemented');
  }

  async merge(source, target, opts) {
    throw new Error('IVCSProvider.merge() must be implemented');
  }

  async branch(name, opts) {
    throw new Error('IVCSProvider.branch() must be implemented');
  }

  async tag(name, message, opts) {
    throw new Error('IVCSProvider.tag() must be implemented');
  }

  async status(opts) {
    throw new Error('IVCSProvider.status() must be implemented');
  }

  async log(opts) {
    throw new Error('IVCSProvider.log() must be implemented');
  }

  async diff(from, to, opts) {
    throw new Error('IVCSProvider.diff() must be implemented');
  }

  async addRemote(name, url, opts) {
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
