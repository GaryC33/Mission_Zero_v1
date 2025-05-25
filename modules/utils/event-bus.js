// modules/utils/event-bus.js
export class EventBus {
    constructor() {
        this.eventListeners = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName - The name of the event.
     * @param {function} listener - The callback function to execute when the event is emitted.
     */
    on(eventName, listener) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(listener);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} eventName - The name of the event.
     * @param {function} listenerToRemove - The specific listener to remove.
     */
    off(eventName, listenerToRemove) {
        if (!this.eventListeners[eventName]) {
            return;
        }
        this.eventListeners[eventName] = this.eventListeners[eventName].filter(
            listener => listener !== listenerToRemove
        );
    }

    /**
     * Emit an event, calling all subscribed listeners.
     * @param {string} eventName - The name of the event to emit.
     * @param {any} [data] - Optional data to pass to the listeners.
     */
    emit(eventName, data) {
        if (!this.eventListeners[eventName]) {
            return;
        }
        this.eventListeners[eventName].forEach(listener => {
            listener(data);
        });
    }
}