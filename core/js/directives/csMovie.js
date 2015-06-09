/**************************************************
 *              Movie Directive                   *
 *               HTML5 Videos                     *
 **************************************************/

angular.module('cosmo').directive('csMovie', ['Page', '$routeParams', '$rootScope', 'Users', '$sce', function(Page, $routeParams, $rootScope, Users, $sce) {
    return {
        template: '<video ng-dblclick="clicked()"><source ng-repeat="video in videos" ng-src="{{video.src}}"></video>',
        replace: true,
        link: function(scope, elm, attrs, ctrl) {

            if(Page.extras[attrs.csMovie]){
                scope.videos = angular.fromJson(Page.extras[attrs.csMovie]);
                if(scope.videos[0].controls)
                    elm.attr('controls', true);
                if(scope.videos[0].autoplay)
                    elm.attr('autoplay', true);
                if(scope.videos[0].loop)
                    elm.attr('loop', true);
                if(scope.videos[0].autoload)
                    elm.attr('autoload', true);
            } else if(Users.admin)
                scope.videos = [{ src: 'core/img/image.svg', type: 'video' }];

            // Check if user is an admin
            if(Users.admin) {
                scope.clicked = function(){
                    $rootScope.$broadcast('editFiles', angular.toJson({
                            id: attrs.csMovie,
                            gallery: true,
                            images: scope.videos
                        })
                    );
                };

                // Save edits/selection of the movie
                scope.$on('choseGalleryFile', function(event, data){
                    if(data.id === attrs.csMovie){
                        scope.videos = data.data;
                        Page.extras[attrs.csMovie] = scope.videos;
                        if(data.class)
                            elm.addClass(data.class);
                    }
                });
            }
        }
    };
}]);
