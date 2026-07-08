/**
 * EventBus - Core event system for StaffForge plugins and pipeline hooks.
 * Implements IEventBus from @staffforge/plugin-sdk.
 *
 * Singleton instance shared across the framework.
 *
 * Events emitted by PipelineExecutor:
 *   - pipeline:start       { pipelineId, taskType }
 *   - pipeline:complete    { pipelineId, taskType, duration }
 *   - pipeline:error       { pipelineId, taskType, error }
 *   - agent:start          { agentId, pipelineId }
 *   - agent:complete       { agentId, pipelineId, duration }
 *   - agent:error          { agentId, pipelineId, error }
 *   - agent:skip           { agentId, pipelineId, reason }
 *   - level:start          { level, pipelineId }
 *   - level:complete       { level, pipelineId, duration }
 *   - subagent:spawn       { subagentType, taskId }
 *   - subagent:complete    { subagentType, taskId, duration }
 *   - subagent:error       { subagentType, taskId, error }
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name, or '*' for all events
   * @param {function} handler - Callback receiving (payload, eventName)
   * @returns {{ dispose: () => void }} Unsubscribe handle
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);

    return {
      dispose: () => this.off(event, handler),
    };
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {function} handler - The handler to remove
   */
  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event - Event name
   * @param {any} payload - Event data
   */
  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload, event);
        } catch (err) {
          console.error(`EventBus: error in handler for "${event}":`, err.message);
        }
      }
    }

    const wildcardHandlers = this._listeners.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(payload, event);
        } catch (err) {
          console.error(`EventBus: error in wildcard handler for "${event}":`, err.message);
        }
      }
    }
  }

  /**
   * Subscribe to an event, auto-unsubscribing after first trigger.
   * @param {string} event - Event name
   * @param {function} handler - Event handler function
   * @returns {{ dispose: () => void }} Disposable to cancel before trigger
   */
  once(event, handler) {
    const wrapper = (payload, evt) => {
      this.off(event, wrapper);
      handler(payload, evt);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove all listeners, optionally filtered by event name.
   * @param {string} [event] - If provided, only remove listeners for this event
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Get the count of listeners for an event.
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    const handlers = this._listeners.get(event);
    return handlers ? handlers.size : 0;
  }

  /**
   * List all registered event names.
   * @returns {string[]}
   */
  eventNames() {
    return [...this._listeners.keys()];
  }
}

/** Singleton instance */
const eventBus = new EventBus();

export default eventBus;
export { EventBus, eventBus };
