/**************************************************
 *           Image Gallery Directive              *
 *   Create repeating images wrapped in a div     *
 **************************************************/

angular.module('cosmo').directive('csGallery', ['Page', '$rootScope', 'REST', '$timeout', 'Users', '$sce', 'Responsive', 'Hooks', function(Page, $rootScope, REST, $timeout, Users, $sce, Responsive, Hooks){
    return {
        template: '<div class="cs-gallery"><img ng-src="{{image.url}}" ng-repeat="image in images | limitTo:limitNum | filter:search" ng-hide="$index!==currentIndex && showOnlyOne" ng-click="clickedGallery($index)"></div>',
        scope: {},
        replace: true,
        link: function(scope, elm, attrs){

            // Initialize
            if(attrs.limit)
                scope.limitNum = parseInt(attrs.limit);
            else
                scope.limitNum = 10000;

            function updateGallery(){
                // Get images
                if(Page.extras[attrs.csGallery]){
                    Page.extras[attrs.csGallery] = angular.fromJson(Page.extras[attrs.csGallery]);
                    var gallery = angular.copy(Page.extras[attrs.csGallery]);
                    // Make all images responsive
                    angular.forEach(gallery, function(image){
                        if(image.responsive === 'yes')
                            image.url = Hooks.imageHookNotify(Responsive.resize(image.url, image.size));
                        else
                            image.url = Hooks.imageHookNotify(image.url);
                    });
                    scope.images = gallery;
                } else if(Users.admin) {
                    Page.extras[attrs.csGallery] = [{ url: 'core/img/image.svg', src: 'core/img/image.svg', type: 'image' }];
                    scope.images = [{ url: 'core/img/image.svg', src: 'core/img/image.svg', type: 'image' }];
                }
                $rootScope.$broadcast(attrs.csGallery, scope.images);
            }
            updateGallery();

            // Update the gallery
            scope.$on('contentGet', function(data){
                updateGallery();
            });

            // Bug: currently adjusts limit of all galleries on the page. Isolate
            // Get a new limit on the number of images displayed
            scope.$on('galleryLimitNum', function(event, data){
                if(data.increase)
                    scope.limitNum += data.increase;
                else if(data.decrease)
                    scope.limitNum -= data.decrease;
                else
                    scope.limitNum = data.limit;
            });

            // Apply filtering if available
            if(attrs.filter){
                scope.$on(attrs.filter, function(event, data){
                    scope.search = data.term;
                });
            }

            // Check if image should be hidden
            if(attrs.type === 'slider'){
                scope.showOnlyOne = true;
                scope.currentIndex = 0;
                scope.$on(attrs.csGallery + '-changeIndex', function(event, data){
                    scope.currentIndex = data.index;
                });
            } else
                scope.showOnlyOne = false;

            // Check if user is an admin
            if(Users.admin) {
                // When clicked, open a modal window to edit
                scope.clickedGallery = function(index){
                    $rootScope.$broadcast('editFiles', angular.toJson({
                            id: attrs.csGallery,
                            gallery: true,
                            images: scope.images
                        })
                    );
                };

                // Watch for edits to the gallery
                scope.$on('choseGalleryFile', function(event, data){
                    if(data.id === attrs.csGallery){
                        // Get raw URL
                        var records = [];
                        angular.forEach(data.data, function(item){
                            if(typeof item.url === 'string')
                                records.push(item);
                            else {
                                records.push({
                                    alt: item.alt,
                                    class: item.class,
                                    href: item.href,
                                    id: item.id,
                                    tags: item.tags,
                                    title: item.title,
                                    type: item.type,
                                    url: $sce.getTrustedUrl(item.url)
                                });
                            }
                        });
                        scope.images = records;
                        console.log(records);
                        Page.extras[attrs.csGallery] = scope.images;
                        if(data.class)
                            elm.addClass(data.class);

                        updateGallery();
                    }
                });
            }
        }
    };
}]);
