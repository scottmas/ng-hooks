(function(window, angular){

    //This module implements functionality almost identical to angular's implementation of $broadcast, $emit, and $on
    //with the difference that the $emit and $broadcast equivalents can have return values.

    var ngHooks = angular.module('ngHooks', []);

    ngHooks.config(['$provide', function($provide){

        $provide.decorator("$rootScope", ["$delegate", "$exceptionHandler", function($delegate, $exceptionHandler){

                $delegate.$$hookListeners = {};
                $delegate.$$hookListenerCount = {};

                //extend $new method to add private $$hookListeners and $$hookListenerCount properties to each scope.
                var newFn = $delegate.constructor.prototype.$new;
                Object.defineProperty($delegate.constructor.prototype, '$new', {

                    value: function(){
                        var args = [].slice.call(arguments);
                        var child =  newFn.apply(this, args);
                        child.$$hookListeners = {};
                        child.$$hookListenerCount = {};
                        return child;
                    }
                });

                //Scope method that is virtually identical to $on but has uses a different listener registry
                Object.defineProperty($delegate.constructor.prototype, '$onHook', {
                    value:  function(name, listener) {
                        var namedListeners = this.$$hookListeners[name];
                        if (!namedListeners) {
                            this.$$hookListeners[name] = namedListeners = [];
                        }
                        namedListeners.push(listener);

                        var current = this;
                        do {
                            if (!current.$$hookListenerCount[name]) {
                                current.$$hookListenerCount[name] = 0;
                            }
                            current.$$hookListenerCount[name]++;
                        } while ((current = current.$parent));

                        var self = this;
                        return function() {
                            namedListeners[indexOf(namedListeners, listener)] = null;
                            decrementListenerCount(self, 1, name);
                        };
                    },
                    enumerable: false
                });

                //Alias for the $onHook function to make it more intuitive to use inside directives.
                Object.defineProperty($delegate.constructor.prototype, '$onHookCall', {
                    value: $delegate.constructor.prototype.$onHook,
                    enumerable: false
                })


                //Similar to $emit except it has a return value and stops propagation at the first return value
                Object.defineProperty($delegate.constructor.prototype, '$triggerHook', {
                    value:  function(name, args) {
                        var empty = [],
                            namedListeners,
                            scope = this,
                            stopPropagation = false,
                            event = {
                                name: name,
                                targetScope: scope,
                                stopPropagation: function() {stopPropagation = true;},
                                preventDefault: function() {
                                    event.defaultPrevented = true;
                                },
                                defaultPrevented: false
                            },
                            listenerArgs = concat([], arguments, 1),
                            i, length, ret;

                        do {
                            event.currentScope = scope;
                            namedListeners = scope.$$hookListeners[name] || empty;
                            for (i=0, length=namedListeners.length; i<length; i++) {

                                // if listeners were deregistered, defragment the array
                                if (!namedListeners[i]) {
                                    namedListeners.splice(i, 1);
                                    i--;
                                    length--;
                                    continue;
                                }
                                try {
                                    //allow all listeners attached to the current scope to run
                                    if(typeof (ret = namedListeners[i].apply(null, listenerArgs)) !== 'undefined'){//Stop propagation at the first encountered return value
                                        return ret;
                                    }
                                } catch (e) {
                                    $exceptionHandler(e);
                                }
                            }

                            //if any listener on the current scope stops propagation, prevent bubbling
                            if (stopPropagation) return;
                            //traverse upwards
                            scope = scope.$parent;
                        } while (scope);

                    },
                    enumerable: false
                });

               //Almost exactly the same as $broadcast, but it returns an array of the return values from listening directives
                Object.defineProperty($delegate.constructor.prototype, '$callHook', {
                    value:  function(name, args) {
                        var target = this,
                            current = target,
                            next = target,
                            event = {
                                name: name,
                                targetScope: target,
                                preventDefault: function() {
                                    event.defaultPrevented = true;
                                },
                                defaultPrevented: false
                            },
                            listenerArgs = concat([], arguments, 1),
                            listeners, i, length,
                            ret = [];

                        //down while you can, then up and next sibling or up and next sibling until back at root
                        while ((current = next)) {
                            event.currentScope = current;
                            listeners = current.$$hookListeners[name] || [];
                            for (i=0, length = listeners.length; i<length; i++) {
                                // if listeners were deregistered, defragment the array
                                if (!listeners[i]) {
                                    listeners.splice(i, 1);
                                    i--;
                                    length--;
                                    continue;
                                }

                                try {
                                    ret.push(listeners[i].apply(null, listenerArgs));
                                } catch(e) {
                                    $exceptionHandler(e);
                                }
                            }


                            // Insanity Warning: scope depth-first traversal
                            // yes, this code is a bit crazy, but it works and we have tests to prove it!
                            // this piece should be kept in sync with the traversal in $digest
                            // (though it differs due to having the extra check for $$hookListenerCount)
                            if (!(next = ((current.$$hookListenerCount[name] && current.$$childHead) ||
                                (current !== target && current.$$nextSibling)))) {
                                while(current !== target && !(next = current.$$nextSibling)) {
                                    current = current.$parent;
                                }
                            }
                        }
                        return ret;
                    },
                    enumerable: false
                });

            return $delegate
        }])
    }]);

    function concat(array1, array2, index) {
        return array1.concat([].slice.call(array2, index));
    }

    function decrementListenerCount(current, count, name) {
        do {
            current.$$listenerCount[name] -= count;

            if (current.$$listenerCount[name] === 0) {
                delete current.$$listenerCount[name];
            }
        } while ((current = current.$parent));
    }

    function indexOf(array, obj) {
        if (array.indexOf) return array.indexOf(obj);

        for (var i = 0; i < array.length; i++) {
            if (obj === array[i]) return i;
        }
        return -1;
    }
})(window, window.angular);
