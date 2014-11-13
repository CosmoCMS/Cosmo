angular.module('pendant', [])

.controller('pendantCtrl', ['$scope', 'REST', 'Hooks', 'Responsive', function($scope, REST, Hooks, Responsive){
    REST.content.query({}, function(data){
        angular.forEach(data, function(data2, key){
            data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured));
            // Get comments for this page
            REST.comments.query({ id: data2.id }, function(commentsData){
                data2.commentsNum = commentsData.length;
            });
        });
        $scope.posts = data;
    });
}])

.controller('pendantHeaderCtrl', ['Page', '$scope', function(Page, $scope){
    $scope.scrollingUp = true;
    $scope.panel = 'menu';
    
    // Make the header fixed when scrolling up
    angular.element(window).on('scroll', function(){
        var docOffset = document.documentElement.scrollTop||document.body.scrollTop;
        if(docOffset < Page.misc.pendantHeader || docOffset <= 0 || docOffset === Page.misc.pendantHeader && Page.misc.prevScroll === true)
            $scope.$apply($scope.scrollingUp = true);
        else
            $scope.$apply($scope.scrollingUp = false);
        Page.misc.pendantHeader = docOffset;
        Page.misc.prevScroll = $scope.scrollingUp;
    });
}])

.directive('onePost', ['REST', 'Hooks', 'Responsive', 'Page', function(REST, Hooks, Responsive, Page){
    return {
        scope: {},
        templateUrl: 'themes/Pendant/partials/one.html',
        link: function(scope, elm, attrs){
            scope.search = {};
            if(attrs.onePost)
                scope.search.tags = attrs.onePost;
            scope.limitNum = 10;
            scope.article = {};
            scope.article.tag = attrs.tag;
            scope.page = {};
            scope.page.type = Page.type;
            
            // Get content
            REST.content.query({}, function(data){
                angular.forEach(data, function(data2){
                    data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'medium'));
                    // Get comments for this page
                    REST.comments.query({ id: data2.id }, function(commentsData){
                        data2.commentsNum = commentsData.length;
                    });
                });
                scope.posts = data;
            });
            
            // Watch for infinity scroll reaching the bottom
            scope.$on('infinityScroll', function(){
                scope.limitNum += 10;
            });
        }
    };
}])

.directive('rowLeft', ['REST', 'Hooks', 'Responsive', function(REST, Hooks, Responsive){
    return {
        scope: {},
        templateUrl: 'themes/Pendant/partials/row-left.html',
        link: function(scope, elm, attrs){
            scope.search = {};
            if(attrs.rowLeft)
                scope.search.tags = attrs.rowLeft;
            scope.article = {};
            scope.article.tag = attrs.tag;
            
            REST.content.query({}, function(data){
                angular.forEach(data, function(data2, key){
                    data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'large'));
                    // Get comments for this page
                    REST.comments.query({ id: data2.id }, function(commentsData){
                        data2.commentsNum = commentsData.length;
                    });
                });
                scope.posts = data;
            });
        }
    };
}])

.directive('rowRight', ['REST', 'Hooks', 'Responsive', function(REST, Hooks, Responsive){
    return {
        scope: {},
        templateUrl: 'themes/Pendant/partials/row-right.html',
        link: function(scope, elm, attrs){
            scope.search = {};
            if(attrs.rowRight)
                scope.search.tags = attrs.rowRight;
            scope.article = {};
            scope.article.tag = attrs.tag;
            
            REST.content.query({}, function(data){
                angular.forEach(data, function(data2, key){
                    data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'large'));
                    // Get comments for this page
                    REST.comments.query({ id: data2.id }, function(commentsData){
                        data2.commentsNum = commentsData.length;
                    });
                });
                scope.posts = data;
            });
        }
    };
}])

.directive('threePosts', ['REST', 'Hooks', 'Responsive', function(REST, Hooks, Responsive){
    return {
        scope: {},
        templateUrl: 'themes/Pendant/partials/three.html',
        link: function(scope, elm, attrs){
            scope.search = {};
            if(attrs.threePosts)
                scope.search.tags = attrs.threePosts;
            scope.article = {};
            scope.article.tag = attrs.tag;
            
            REST.content.query({}, function(data){
                angular.forEach(data, function(data2){
                    data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'medium'));
                    // Get comments for this page
                    REST.comments.query({ id: data2.id }, function(commentsData){
                        data2.commentsNum = commentsData.length;
                    });
                });
                scope.posts = data;
            });
        }
    };
}])

.directive('threeBlock', ['REST', 'Hooks', 'Responsive', function(REST, Hooks, Responsive){
    return {
        scope: {},
        templateUrl: 'themes/Pendant/partials/three-block.html',
        link: function(scope, elm, attrs){
            scope.search = {};
            if(attrs.threeBlock)
                scope.search.tags = attrs.threeBlock;
            scope.article = {};
            scope.article.tag = attrs.tag;
            
            REST.content.query({}, function(data){
                angular.forEach(data, function(data2, key){
                    data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'large'));
                    // Get comments for this page
                    REST.comments.query({ id: data2.id }, function(commentsData){
                        data2.commentsNum = commentsData.length;
                    });
                });
                scope.posts = data;
            });
        }
    };
}])

.directive('threeUniform', ['REST', 'Hooks', 'Responsive', function(REST, Hooks, Responsive){
    return {
        scope: {},
        templateUrl: 'themes/Pendant/partials/three-uniform.html',
        link: function(scope, elm, attrs){
            scope.search = {};
            if(attrs.threeUniform)
                scope.search.tags = attrs.threeUniform;
            scope.article = {};
            scope.article.tag = attrs.tag;
            
            REST.content.query({}, function(data){
                angular.forEach(data, function(data2){
                    data2.featured = Hooks.imageHookNotify(Responsive.resize(data2.featured, 'medium'));
                    // Get comments for this page
                    REST.comments.query({ id: data2.id }, function(commentsData){
                        data2.commentsNum = commentsData.length;
                    });
                });
                scope.posts = data;
            });
        }
    };
}])

.directive('captionLeftSmall', function(){
    return {
        templateUrl: 'themes/Pendant/partials/caption-left-sml.html',
        replace: true,
        link: function(scope, elm, attrs){
            scope.timestamp = new Date().getTime();
            elm.removeAttr('caption-left-small');
        }
    };
})

.directive('captionRightSmall', function(){
    return {
        templateUrl: 'themes/Pendant/partials/caption-right-sml.html',
        replace: true,
        link: function(scope, elm, attrs){
            scope.timestamp = new Date().getTime();
            elm.removeAttr('caption-right-small');
        }
    };
})

.directive('captionLeftMedium', function(){
    return {
        templateUrl: 'themes/Pendant/partials/caption-left-med.html',
        replace: true,
        link: function(scope, elm, attrs){
            scope.timestamp = new Date().getTime();
            elm.removeAttr('caption-left-medium');
        }
    };
})

.directive('captionRightMedium', function(){
    return {
        templateUrl: 'themes/Pendant/partials/caption-right-med.html',
        replace: true,
        link: function(scope, elm, attrs){
            scope.timestamp = new Date().getTime();
            elm.removeAttr('caption-right-medium');
        }
    };
})

.directive('infinityScroll', ['$rootScope', function($rootScope){
    return {
        link: function(scope, elm, attrs){
            // Check when user has scrolled to the bottom 300px of the page
            angular.element(window).on('scroll', function(){
                if(document.body.scrollHeight - document.body.clientHeight - 300 <= (document.documentElement.scrollTop||document.body.scrollTop))
                    $rootScope.$broadcast('infinityScroll');
            });
        }
    };
}])

.directive('activateOnScroll', function(){
    return {
        link: function(scope, elm, attrs){
            var elmOffset = elm[0].offsetTop;
            
            // Watch for if the element has been scrolled to
            angular.element(window).on('scroll', function(){
                var docOffset = document.documentElement.scrollTop||document.body.scrollTop;
                if(docOffset >= elmOffset - 400){
                    elm.addClass('cos-scroll-transition');
                }
            });
        }
    };
});