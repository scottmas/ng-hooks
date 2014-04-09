### ngHooks ###
------------

ngHooks is a library that (1) allows arbitrary Javascript to be injected at predefined
points in a directive's link or controller function and (2) exposes a directive API
which can then be called within a controller, or even in parent directives.

Note: Directives can only communicate with controllers of whom their scope is a child
and controllers can only communicate with directives declared within their scope.

In order to get started, first inject the module into your own
```
angular.module('yourApp', ['ngHooks', ...])
```

Then use it inside a controller or a directive

Controller:
```

$scope.$onHook('someDirective.someHookName', function(someParameter){
	//arbitrary javascript
	var foo = 'bar';
	return foo
})

var ret = $scope.$callHook('someDirective.someHookCall', someParameter)
//ret equals 'xor'

```

Directive (Inside link or controller function)
```
$scope.$onHookCall('someDirective.someHookCall', function(someParameter){
	//arbitrary javascript
	var zeta = 'xor';
	return zeta;
})

var ret = $scope.$triggerHook('someDirective.someHookName', someParameter)
//ret equals 'bar'

```