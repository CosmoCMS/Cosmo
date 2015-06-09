/**************************************************
 *              Notify Directive                  *
 *            Manage notifications                *
 **************************************************/

angular.module('cosmo').directive('csNotification', ['$timeout', '$sce', function($timeout, $sce){
    return {
        template: '<div ng-show="showNotification" class="{{classes}}"><span ng-bind-html="message"></span></div>',
        replace: true,
        link: function(scope, elm, attrs){
            // Watch for notifications
            scope.$on('notify', function(event, data){
                scope.showNotification = true;
                scope.message = $sce.trustAsHtml(data.message);

                // Default class is alert-alert
                if(!data.classes)
                    scope.classes = 'alert-alert';
                else
                    scope.classes = data.classes;

                // Default duration is 5 seconds
                if(!data.duration)
                    data.duration = 5000;

                // Disappear after 5 seconds
                $timeout(function(){
                    scope.showNotification = false;
                }, data.duration);
            });
        }
    };
}]);
