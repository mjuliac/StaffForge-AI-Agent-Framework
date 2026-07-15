/**
 * Event bus interface for plugin communication.
 * Core provides a default implementation; plugins can provide alternatives.
 */
export class IEventBus {
  /**
   * Subscribe to an event.
   * @param {string} event - Event name (e.g., 'pipeline:start', 'agent:complete')
   * @param {function} handler - Event handler function
   * @returns {{ dispose: () => void }} Disposable to unsubscribe
   */
  on(_event, _handler) {
    throw new Error('IEventBus.on() must be implemented');
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {function} handler - The handler to remove
   */
  off(_event, _handler) {
    throw new Error('IEventBus.off() must be implemented');
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event - Event name
   * @param {any} payload - Event data
   */
  emit(_event, _payload) {
    throw new Error('IEventBus.emit() must be implemented');
  }

  /**
   * Subscribe to an event, auto-unsubscribing after first trigger.
   * @param {string} event - Event name
   * @param {function} handler - Event handler function
   * @returns {{ dispose: () => void }} Disposable to cancel before trigger
   */
  once(_event, _handler) {
    throw new Error('IEventBus.once() must be implemented');
  }

  /**
   * Remove all listeners, optionally filtered by event name.
   * @param {string} [event] - If provided, only remove listeners for this event
   */
  removeAllListeners(_event) {
    throw new Error('IEventBus.removeAllListeners() must be implemented');
  }
}
