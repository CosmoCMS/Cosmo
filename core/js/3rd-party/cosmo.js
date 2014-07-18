'use strict';
angular.module('cosmo', [])

/****************************************************************************************************
 *                                           Controllers                                            *
 ****************************************************************************************************/





/**************************************************
 *              Search Controller                 *
 **************************************************

.controller('searchCtrl', ['$scope', '$http', 'Page', '$rootScope', '$location', function($scope, $http, Page, $rootScope, $location){
    $scope.search = function(){
        $http.query('search.cosmo.io', { q: $scope.search }, function(data){
            $scope.results = data;
            $location.path('/results');
        });
    };
}])
*/

/**************************************************
 *              URL Controller                    *
 **************************************************/

.controller('urlCtrl', ['$scope', '$routeParams', 'Page', '$rootScope', 'REST', '$location', function($scope, $routeParams, Page, $rootScope, REST, $location){
    
    // Reset variables
    Page.extras = [];
    
    // Load template
    REST.settings.get({}, function(data){
        Page.theme = data.theme;
    });
    
    // Get menus
    REST.menus.query({ fields: 'id' }, function(data){
        Page.menus = data;
    });
    
    // Get content
    REST.content.get({ url: $location.path() }, function(data){
        // Page not found in database
        if(data.status === 'false'){
            // Check if they just pressed back from the error page
            if(Page.url === Page.prefix + 'error'){
                history.back(); // Take the user back before the 404 page
            } else {
                Page.url = Page.prefix + 'error';
                $location.path(Page.prefix + 'error');
            }
        }
        
        Page.id = data.id;
        Page.title = data.title;
        Page.description = data.description;
        Page.header = data.header;
        Page.subheader = data.subheader;
        Page.body = data.body; 
        Page.url = data.url;
        if(data.tags)
            Page.tags = data.tags;
        else
            Page.tags = [];
        Page.type = data.type;
        Page.publish = data.published;
        Page.scheduleDate = data.published_date;
        Page.timestamp = data.timestamp;
        if(data.extras)
            Page.extras = data.extras;
        else
            Page.extras = [];
        
        $scope.template = Page.prefix + 'themes/' + Page.theme + '/' + Page.type;
        
        // Get blocks
        REST.blocks.query({ type: Page.type, url: $location.path() }, function(data){
            Page.blocks = data;
            Page.notifyObservers();
        });
        
    });
    
    var changeTheme = function(){
        if($scope.template !== Page.prefix + '/themes/' + Page.theme + '/' + Page.type)
            $scope.template = Page.prefix + '/themes/' + Page.theme + '/' + Page.type;
    };
    
    Page.registerCallback(changeTheme);
    
}])

/****************************************************************************************************
 *                                           Directives                                             *
 ****************************************************************************************************/




/**************************************************
 *              Block Directive                   *
 **************************************************/

.directive('block', ['Page', '$compile', function(Page, $compile) {
    return {
        link: function(scope, elm, attrs, ctrl) {
            
            var updateBlocks = function() {
                // Match the block(s) to the right location
                if(Page.blocks) {
                    var blockHTML = '';
                    for(var i=0; i < Page.blocks.length; i++) {
                        if(Page.blocks[i]['area'] === attrs.block) {
                            blockHTML += Page.blocks[i]['block'];
                        }
                    }
                    elm.html(blockHTML);
                    $compile(elm.contents())(scope);
                }
            };
            
            Page.registerCallback(updateBlocks);
            Page.notifyObservers();
        }
    };
}])

/**************************************************
 *              Cosmo Directive                   *
 **************************************************/

.directive('cosmo', ['Page', '$routeParams', '$sce', '$rootScope', 'growl', '$compile', 'Users', function(Page, $routeParams, $sce, $rootScope, growl, $compile, Users) {
    return {
        priority: 100,
        link: function(scope, elm, attrs, ctrl) {
            
            scope.editor = {};
            scope.editor.codeEditor = false;
            
            var updateCosmo = function(){
                if(attrs.type === 'table' && Page.extras[attrs.cosmo])
                    Page.extras[attrs.cosmo] = Page.extras[attrs.cosmo].replace(/<table(.*?)>/, '<table class="' + attrs.class + '">');
                
                if(Page[attrs.cosmo])
                    var content = Page[attrs.cosmo];
                else if(Page.extras[attrs.cosmo])
                    var content = Page.extras[attrs.cosmo];
                else if(attrs.prepopulate && Users.admin)
                    var content = attrs.prepopulate;
                else
                    var content = ' ';
                
                if(content)
                    content = content.toString();
                
                // Remove HTML tags if this is a text only area
                if(attrs.type === 'text')
                    content = content.replace(/<[^<]+?>/g, '');
                
                if(content){
                    elm.html(content);
                    if(attrs.type !== 'text')
                        $compile(elm.contents())(scope);
                }
                
            };
            
            // Display the WYSIWYG toolbar
            elm.on('mousedown', function(event) {
                scope.currentBlock = attrs.cosmo; 
                if(attrs.type !== 'text')
                    $rootScope.$broadcast('activateWYSIWYG', event);
            });
            
            Page.registerCallback(updateCosmo);
            
            // See if user is an admin
            if(Users.admin) {
                
                elm.on('paste', function(event){
                    console.log('pasted');
                });
                
                // Watch for edits to the page and save them
                elm.on('keyup', function(event) {
                    
                    // Open quick-save option
                    // '<a ng-controller="pageCtrl" ng-click="savePage()">Quick Save</a>'
                    
                    // Make sure we aren't saving escaped HTML
                    if(scope.editor.codeEditor)
                        var html = scope.unescapeHTML(elm.html());
                    else
                        var html = elm.html();
                    
                    // Don't save the fields marked 'none'
                    if(attrs.cosmo === 'none') {
                        $rootScope.$broadcast('wysiwygEdit', { html: html });
                    } else
                    {
                        // Save changes to Page factory
                        if(attrs.cosmo !== 'header' && attrs.cosmo !== 'subheader' && attrs.cosmo !== 'body')
                            if(attrs.type === 'text')
                                Page.extras[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                            else
                                Page.extras[attrs.cosmo] = html;
                        else{
                            if(attrs.type === 'text')
                                Page[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                            else
                                Page[attrs.cosmo] = html;
                        }

                        // Save to local storage
                        localStorage.setItem($routeParams.url + attrs.cosmo, html);
                    }
                });
                
                // Make content editable
                elm.attr('contenteditable', 'true');
                
                // Hide toolbar on focus out
                elm.on('focusout', function(){
                    $rootScope.$broadcast('hideWYSIWYG');
                });
                
                scope.$on('toggleHTMLEditor', function(){
                    // Make sure to only edit the selected block
                    if(scope.currentBlock === attrs.cosmo){
                        scope.editor.codeEditor = !scope.editor.codeEditor;
                        if(scope.editor.codeEditor)
                            elm.html(scope.escapeHTML(elm.html()));
                        else
                            elm.html(scope.unescapeHTML(elm.html()));
                    }
                });
                
                // Save data and refresh the page
                scope.$on('saveAndRefresh', function(){
                    
                    // Save 
                    
                    // Make sure we aren't saving escaped HTML
                    if(scope.editor.codeEditor)
                        var html = scope.unescapeHTML(elm.html());
                    else
                        var html = elm.html();
                    
                    // Save changes to Page factory
                    if(attrs.cosmo !== 'header' && attrs.cosmo !== 'subheader' && attrs.cosmo !== 'body')
                        if(attrs.type === 'text')
                            Page.extras[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                        else
                            Page.extras[attrs.cosmo] = html;
                    else{
                        if(attrs.type === 'text')
                            Page[attrs.cosmo] = html.replace(/<[^<]+?>/g, '');
                        else
                            Page[attrs.cosmo] = html;
                    }
                    
                    setTimeout(function(){
                        Page.notifyObservers();
                    }, 200);
                    
                });
                
                // Escape HTML
                scope.escapeHTML = function(str) {
                    return String(str)
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                };
                
                // Revert to normal text from HTML
                scope.unescapeHTML = function(str) {
                    return String(str)
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>');
                };
                
                scope.$on('choseFile', function(event, data){
                    Page.extras[scope.lastClicked] = data.name;
                });
            }
        }
    };
}])

/**************************************************
 *             BGImage Directive                  *
 **************************************************/

.directive('bgimage', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', function(Page, $routeParams, $rootScope, ngDialog, Users) {
    return {
        link: function(scope, elm, attrs, ctrl) {
            
            function updateBGImage(){
                if(Page.extras[attrs.bgimage]){
                    elm.css('background', 'url('+ Page.extras[attrs.bgimage] +') center no-repeat');
                    elm.css('-webkit-background-size', 'cover');
                    elm.css('-moz-background-size', 'cover');
                    elm.css('-o-background-size', 'cover');
                    elm.css('background-size', 'cover');
                } else if(Users.admin) {
                    elm.css('background', 'url(img/image.svg) center no-repeat');
                    elm.css('-webkit-background-size', 'cover');
                    elm.css('-moz-background-size', 'cover');
                    elm.css('-o-background-size', 'cover');
                    elm.css('background-size', 'cover');
                }
            }
            
            Page.registerCallback(updateBGImage);
            Page.notifyObservers();
            
            // Check if user is an admin
            if(Users.admin) {
                
                // Edit photo when double clicked
                scope.clicked = function(){
                    scope.lastClicked = attrs.bgimage;
                    ngDialog.open({ template: 'core/html/modal.html', data: JSON.stringify({ id: attrs.bgimage }) });
                };
                
                // Update page when another image is chosen
                scope.$on('choseFile', function(event, data){
                    if(data.id === scope.lastClicked){
                        Page.extras[scope.lastClicked] = data.name;
                        elm.css('background', 'url('+ data.name +') center no-repeat');
                        elm.css('-webkit-background-size', 'cover');
                        elm.css('-moz-background-size', 'cover');
                        elm.css('-o-background-size', 'cover');
                        elm.css('background-size', 'cover');
                    }
                });
            }
        }
    };
}])

/**************************************************
 *              Image Directive                   *
 **************************************************/

.directive('image', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', 'REST', '$compile', function(Page, $routeParams, $rootScope, ngDialog, Users, REST, $compile) {
    return {
        scope: {
            image: '@'
        },
        template: '<img ng-src="{{data}}" class="{{class}}" />',
        replace: true,
        compile: function(scope, elm, attrs, ctrl) {
            return {
                pre: function(scope, elm, attrs){
                    if(Users.admin)
                        attrs.ngSrc = '{{data}}';
                },
                post: function(scope, elm, attrs){
                    
                    // Don't change premade images in the body
                    if(!attrs.src){
                        if(Page.extras[attrs.image]){
                            scope.data = Page.extras[attrs.image];
                            // Add classes
                            REST.files.get({ url: Page.extras[attrs.image] }, function(data) {
                                scope.class = data.class;
                            });
                        } else if(Users.admin)
                            scope.data = 'img/image.svg';
                    } else {
                        // Add classes
                        REST.files.get({ url: Page.extras[attrs.image] }, function(data){
                            elm.addClass(data.class);
                        });
                    }

                    // Check if user is an admin
                    if(Users.admin) {
                        elm.on('click', function(){
                            scope.lastClicked = attrs.image;
                            ngDialog.open({ template: 'core/html/modal.html', data: JSON.stringify({ id: attrs.image }) });
                        });

                        scope.$on('choseFile', function(event, data){
                            if(data.id === scope.lastClicked){
                                Page.extras[scope.lastClicked] = data.name;
                                scope.data = data.name;
                                if(data.class)
                                    elm.addClass(data.class);
                            }
                        });
                    }
                }
            };
        }
    };
}])

/**************************************************
 *           Image Gallery Directive              *
 **************************************************/

.directive('gallery', ['Page', '$rootScope', 'REST', '$timeout', 'ngDialog', 'Users', function(Page, $rootScope, REST, $timeout, ngDialog, Users){
    return {
        template: '<img ng-src="{{image.url}}" ng-repeat="image in images | filter:search" ng-hide="$index!==currentIndex && showOnlyOne" ng-click="clickedGallery($index)">',
        replace: true,
        link: function(scope, elm, attrs){
            
            function updateGallery(){
                // Get images
                if(Page.extras[attrs.gallery]){
                    // Un-stringify
                    /*
                    try {
                        Page.extras[attrs.gallery] = JSON.parse(Page.extras[attrs.gallery]);
                    } catch (e) {
                        // Already un-stringified. Do nothing
                    }
                    */
                    // Convert from comma deliniated string into an array
                    if(Page.extras[attrs.gallery].indexOf(",") !== -1){
                        var imagesArr = Page.extras[attrs.gallery].split(',');
                        scope.images = [];
                        for(var i=0; i<imagesArr.length; i++){
                            if(imagesArr[i]){
                                REST.files.get({ fileID: imagesArr[i] }, function(data){
                                    if(data.id){
                                        scope.images.push(data);
                                        $rootScope.$broadcast(attrs.gallery, scope.images);
                                    }
                                });
                            }
                        }
                    }
                    else if(Array.isArray(Page.extras[attrs.gallery]))
                        scope.images = Page.extras[attrs.gallery];
                    else {
                        scope.images = [];
                        REST.files.get({ fileID: Page.extras[attrs.gallery] }, function(data){
                            scope.images.push(data);
                            $rootScope.$broadcast(attrs.gallery, scope.images);
                        });
                    }
                } else if(Users.admin) {
                    scope.images = [{ url: 'img/image.svg' }];
                    $rootScope.$broadcast(attrs.gallery, scope.images);
                }
                
                // Apply filtering if available
                if(attrs.filter){
                    scope.$on(attrs.filter, function(event, data){
                        scope.search = data.term;
                    });
                }
            }
            updateGallery();
            //Page.registerCallback(updateGallery);
            //Page.notifyObservers();
            
            // Check if image should be hidden
            if(attrs.type === 'slider'){
                scope.showOnlyOne = true;
                scope.currentIndex = 0;
                scope.$on(attrs.gallery + '-changeIndex', function(event, data){
                    scope.currentIndex = data.index;
                });
            } else
                scope.showOnlyOne = false;

            // Check if user is an admin
            if(Users.admin) {
                // When clicked, open a modal window to edit
                scope.clickedGallery = function(index){
                    scope.lastClicked = attrs.gallery;
                    ngDialog.open({ template: 'core/html/modal.html', data: JSON.stringify({ id: attrs.gallery, gallery: true, images: scope.images }) });
                };
                
                // Watch for edits to the gallery
                scope.$on('choseGalleryFile', function(event, data){
                    if(data.id === scope.lastClicked){
                        Page.extras[scope.lastClicked] = data.data;
                        scope.images = data.data;
                        if(data.class)
                            elm.addClass(data.class);
                    }
                });
            }
        }
    };
}])

/**************************************************
 *                Link Directive                  *
 **************************************************/

.directive('link', ['Page', 'ngDialog', 'Users', function(Page, ngDialog, Users){
    return {
        scope: {
            link: '@'
        },
        template: '<a ng-href="{{data.url}}" ng-click="editLink($event)">{{data.text}}</a>',
        replace: true,
        controller: 'linkCtrl',
        link: function(scope, elm, attrs){
            
            if(Page.extras[attrs.link]){
                var linkArr = Page.extras[attrs.link].split(';;');
                scope.data = { text: linkArr[0], url: linkArr[1] };
            } else if(Users.admin)
                scope.data = { text: 'Add a Link', url: '' };
            
            // Check if user is an admin
            if(Users.admin) {
                // Edit this link if you are logged in as an administrator
                scope.editLink = function($event){
                    $event.preventDefault();
                    ngDialog.open({ template: 'core/html/partials/link.html' });
                };

                // Watch for edits to the gallery
                scope.$on('editedLink', function(event, obj){
                    scope.data.text = obj.text;
                    scope.data.url = obj.url;
                    Page.extras[attrs.link] = obj.text + ';;' + obj.url;
                });
            }
            
        }
    };
}])

/**************************************************
 *               Link Controller                  *
 **************************************************/

.controller('linkCtrl', ['$scope', '$rootScope', 'ngDialog', function($scope, $rootScope, ngDialog){
    $scope.save = function(){
        $rootScope.$broadcast('editedLink', {text: $scope.link.text, url: $scope.link.url});
        ngDialog.close();
    };
}])

/**************************************************
 *              Movie Directive                   *
 **************************************************/

.directive('movie', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', '$sce', function(Page, $routeParams, $rootScope, ngDialog, Users, $sce) {
    return {
        template: '<video ng-src="{{data}}" ng-click="clicked()"></video>',
        replace: true,
        link: function(scope, elm, attrs, ctrl) {
            
            if(Page.extras[attrs.movie])
                scope.data = Page.extras[attrs.movie];
            else if(Users.admin)
                scope.data = 'img/video.svg';
            
            // Check if user is an admin
            if(Users.admin) {
                scope.clicked = function(){
                    scope.lastClicked = attrs.movie;
                    ngDialog.open({ template: 'core/html/modal.html', data: JSON.stringify({ id: attrs.movie }) });
                };
                
                scope.$on('choseFile', function(event, data){
                    if(data.id === scope.lastClicked){
                        Page.extras[scope.lastClicked] = data.name;
                        scope.data = data.name;
                        if(data.class)
                            elm.addClass(data.class);
                    }
                });
            }
        }
    };
}])

/**************************************************
 *              Menus Directive                   *
 **************************************************/

.directive('menu', ['Page', '$compile', function(Page, $compile) {
    return {
        templateUrl: 'core/html/partials/menu-links.html',
        replace: true,
        link: function(scope, elm, attrs, ctrl) {
            // Match the menu to the right location
            var updateMenus = function(){
                if(Page.menus){
                    for(var i=0; i < Page.menus.length; i++){
                        if(Page.menus[i]['area'] === attrs.menu && Page.menus[i]['menu']){
                            scope.list = JSON.parse(Page.menus[i]['menu']);
                        }
                    }
                }
            };
            
            Page.registerCallback(updateMenus);
            Page.notifyObservers();
        }
    };
}])

// Control meta tags
.controller('HTMLCtrl', ['$scope', 'Page', 'Hooks', '$rootScope', function($scope, Page, Hooks, $rootScope){
    // Update meta-tags
    var updateMetaTags = function(){
        var data = Hooks.HTMLHookNotify({title: Page.title, description: Page.description});
        $scope.title = data.title;
        $scope.description = data.description;
        $rootScope.$broadcast('HTMLCallback', {title: $scope.title, description: $scope.description});
    };
    Page.registerCallback(updateMetaTags);
    Page.notifyObservers();
}])

// Create a login box
.directive('login', function() {
    return {
        templateUrl: 'core/html/partials/user-login.html',
        replace: true,
        controller: 'loginRegistrationCtrl'
    };
})

// Create a registration box
.directive('registration', function() {
    return {
        templateUrl: 'core/html/partials/user-registration.html',
        replace: true,
        controller: 'loginRegistrationCtrl'
    };
})

// Login/Registration Controller
.controller('loginRegistrationCtrl', ['$scope', 'REST', '$http', 'ngDialog', '$location', function($scope, REST, $http, ngDialog, $location){
    
    // Initialize panel to show
    $scope.panel = 'login';
    
    $scope.login = {};
    $scope.register = {};
    
    // Create account
    $scope.register = function(){
        if($scope.register.password === $scope.register.confirmPassword){
            REST.users.save({ 
                username: $scope.register.username,
                email: $scope.register.email,
                password: $scope.register.password 
            }, function(data){
                ngDialog.close();
                $location.path('/');
            });
        } else {
            alert("Passwords don't match");
        }
    };
    
    // Login
    $scope.login = function(){
        REST.users.get({ username: $scope.login.username, password: $scope.login.password }, function(data){
            console.log(data);
            if(data.token){
                // Set cookie and headers with username and auth token
                var expdate = new Date();
                expdate.setDate(expdate.getDate() + 90); // 90 days in the future
                document.cookie= "username=" + $scope.login.username.toLowerCase() + ";expires=" + expdate.toGMTString();
                document.cookie= "token=" + data.token + ";expires=" + expdate.toGMTString();
                
                $http.defaults.headers.common['username'] = $scope.login.username.toLowerCase();
                $http.defaults.headers.common['token'] = data.token;
                
                $scope.login.username = '';
                $scope.login.password = '';
                ngDialog.close();
                $location.path('/');
            } else
                alert('Wrong Username/Password');
        });
    };
    
    // Forgot Password todo: create functionality
    $scope.forgotPassword = function(){
        
    };
    
}])

// Search directive
.directive('search', function() {
    return {
        template: '<input type=text"" placeholder="Search..." ng-model="search">',
        controller: 'searchCtrl',
        link: function(scope, elm, attrs, ctrl) {
            
        }
    };
})

// Search results page
.directive('results', ['Page', function(Page) {
    return {
        templateUrl: 'core/html/partials/results.html',
        link: function(scope, elm, attrs, ctrl) {
            scope.results = Page.results;
        }
    };
}])


/****************************************************************************************************
 *                                               Factories                                          *
 ****************************************************************************************************/


// Create Page factory to store page variables globally
.factory('Page', function(){
    
    var callbacks = [];
    
    return {
        id: 0,
        title: '',
        compiledHTML: '',
        description: '',
        header: '',
        subheader: '',
        body: '',
        url: '',
        type: '',
        prefix: '',
        published: '',
        published_date: '',
        timestamp: '',
        extras: [],
        misc: {},
        registerCallback: function(callback){
            callbacks.push(callback);
        },
        notifyObservers: function(){
            angular.forEach(callbacks, function(callback){
                callback();
            });
        }
    };
})

// Register all Hooks
.factory('Hooks', function(){
    
    
    var names = ['HTML', 'Users'];
    var storeHooks = {}; // Store all hooks / callbacks that users register
    var outputObj = {};
    
    // Create Callbacks and Hooks for each section
    for(var i=0; i<names.length; i++){
        
        storeHooks[names[i] + 'Hooks'] = []; // Store registered hooks
        
        // Register Hook
        outputObj[names[i] + 'Hook'] = function(hook){
            storeHooks[names[i] + 'Hooks'].push(hook);
        };
        
        // Notify all Hooks
        outputObj[names[i] + 'HookNotify'] = function(data){
            var newData;
            angular.forEach(storeHooks[names[i] + 'Hooks'], function(hook){
                newData ? newData = hook(newData): newData = hook(data); // Feed the output from the last hook into the next
            });
            return newData ? newData: data; // Return data after handing it off to any hooks
        };
    }
    
    // return outputObj;
    
    var HTMLHooks = [];
    
    return {
        // HTML Ctrl. Passes an object with 'title', and 'description' parameters
        HTMLHook: function(hook){
            HTMLHooks.push(hook); // Register Hook
        },
        HTMLHookNotify: function(data){
            var newData;
            angular.forEach(HTMLHooks, function(hook){
                newData ? newData = hook(newData): newData = hook(data); // Feed the output from the last hook into the next
            });
            return newData ? newData: data; // Return data after handing it off to any hooks
        }
    };
})

// Control RESTful operations
.factory('REST', ['$resource', 'Page', function($resource, Page) {

    return {
        'blocks': $resource(Page.prefix +'api/blocks/:blockID', { blockID: '@blockID'},{ update: { method: 'PUT' } }),
        'blocksRequirements': $resource(Page.prefix +'api/blocks/:blockID/requirements/:requirementID', { blockID: '@blockID', requirementID: '@requirementID'},{ update: { method: 'PUT' } }),
        'content': $resource(Page.prefix +'api/content/:contentID', { contentID: '@contentID'},{ update: { method: 'PUT' } }),
        'contentExtras': $resource(Page.prefix +'api/content/:contentID/extras/', { contentID: '@contentID'}),
        'contentRevisions': $resource(Page.prefix +'api/content/:contentID/revisions/:revisionID', { contentID: '@contentID', revisionID: '@revisionID'}, {update: { method: 'PUT' } }),
        'contentRevisionsExtras': $resource(Page.prefix +'api/content/:contentID/revisions/:revisionID/extras/:extraID', { revisionID: '@revisionID', contentID: '@contentID', extraID: '@extraID'}),
        'contentTags': $resource(Page.prefix +'api/content/:contentID/tags/', { contentID: '@contentID'}),
        'files': $resource(Page.prefix +'api/files/:fileID', { fileID: '@fileID'},{ update: { method: 'PUT' } }),
        'filesTags': $resource(Page.prefix +'api/files/:fileID/tag/:tag', { fileID: '@fileID', tag: '@tag'},{ update: { method: 'PUT' } }),
        'menus': $resource(Page.prefix +'api/menus/:menuID', { menuID: '@menuID'},{ update: { method: 'PUT' } }),
        'modules': $resource(Page.prefix +'api/modules/:moduleID', { moduleID: '@moduleID'},{ update: { method: 'PUT' } }),
        'roles': $resource(Page.prefix +'api/roles/:roleID', { roleID: '@roleID'},{ update: { method: 'PUT' } }),
        'rolesPermissions': $resource(Page.prefix +'api/roles/:roleID/permissions/:permissionID', { roleID: '@roleID', permissionID: '@permissionID'},{ update: { method: 'PUT' } }),
        'sitemaps': $resource(Page.prefix +'api/sitemaps/'),
        'themes': $resource(Page.prefix +'api/themes/:themeID', { themeID: '@themeID' }),
        'settings': $resource(Page.prefix +'api/settings/'),
        'users': $resource(Page.prefix +'api/users/:userID', { userID: '@userID' }),
        'usersRoles': $resource(Page.prefix +'api/users/:userID/roles/:roleID', { userID: '@userID', roleID: '@roleID' })
    };
}])

// Create Page factory to store page variables globally
.factory('Users', function() {
    return {
        admin: false,
        loggedIn: false,
        email: '',
        username: '',
        permissions: []
    };
})

// Filter out html
.filter('plaintext', function(){
    return function(input){
        if(input){
            return input.replace(/<[^<]+?>/g, ' ').replace(/  /g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
        } else
            return input;
    };
})
    
.filter('titlecase', function(){
    return function(input){
        if(typeof input === 'string' && input){
            var words = input.split(' ');
            var exceptions = ' the a an and but or for nor aboard about above across after against along amid among around as at atop before behind below beneath beside between beyond by despite down during for from in inside into like near of off on onto out outside over past regarding round since than through throughout till to toward under unlike until up upon with within without ';
            for(var i=0; i<words.length; i++){
                if(i===0 || i===words.length-1 || exceptions.indexOf(' '+words[i].toLowerCase()+' ') === -1)
                    words[i] = words[i][0].toUpperCase() + words[i].substring(1).toLowerCase();
            }
            return words.join(' ');
        } else
            return '';
    };
})

/**************************************************
 *              Table Directive                   *
 **************************************************/

.directive('cosmoTable', ['Page', '$routeParams', '$rootScope', 'ngDialog', 'Users', '$sce', '$timeout', function(Page, $routeParams, $rootScope, ngDialog, Users, $sce, $timeout) {
    return {
        template: '<table><tr ng-repeat="row in rows track by $index" ng-click="clickedRow({{$index}})"><td ng-repeat="col in row track by $index" ng-click="clickedCol({{$index}})">{{col}}</td></tr></table>',
        replace: true,
        link: function(scope, elm, attrs) {
            
            scope.lastChange;
            
            if(Page.extras[attrs.cosmoTable])
                scope.rows = Page.extras[attrs.cosmoTable];
            else if(Users.admin)
                scope.rows = [['', '']];
            
            // Keep track of the last clicked row
            scope.clickedRow = function(index){
                scope.selectedRow = index;
            };
            
            // Keep track of the last clicked column
            scope.clickedCol = function(index){
                scope.selectedCol = index;
            };
            
            // Check if user is an admin
            if(Users.admin) {
                
                // Save edits to the table every second
                $timeout(function(){
                    Page.extras[attrs.cosmoTable] = scope.rows;
                }, 1000);
                /*
                scope.$watch(function(){
                    return elm.html(); 
                }, function(){
                    var currentTable = [];
                    for(var i=0; i < elm[0].rows.length; i++){
                        currentTable[i] = [];
                        for(var j=0; j < elm[0].rows[i].cells.length; j++){
                            scope.rows[i][j] = elm[0].rows[i].cells[j].innerHTML;
                        }
                    }
                    Page.extras[attrs.cosmoTable] = scope.rows;
                });
                */
                // Add a row above the selected row
                scope.$on('addRowAbove', function(event, data){
                    if(scope.lastChange !== data){
                        var columns = [];
                        for(var i=0; i<scope.rows[0].length; i++)
                            columns.push('');
                        scope.rows.splice(scope.selectedRow + 1, 0, columns );
                    }
                    scope.lastChange = data;
                });
                
                // Add a row below the selected row
                scope.$on('addRowBelow', function(event, data){
                    if(scope.lastChange !== data){
                        var columns = [];
                        for(var i=0; i<scope.rows[0].length; i++)
                            columns.push('');
                        // Check if this is the last row
                        if(scope.rows.length === scope.selectedRow+1)
                            scope.rows.push(columns);
                        else
                            scope.rows.splice(scope.selectedRow, 0, columns );
                        }
                    scope.lastChange = data;
                });
                
                // Delete row
                scope.$on('deleteRow', function(event, data){
                    if(scope.lastChange !== data)
                        scope.rows.splice(scope.selectedRow, 1);
                    scope.lastChange = data;
                });
                
                // Add a column to the right of the selected column
                scope.$on('addColRight', function(event, data){
                    if(scope.lastChange !== data){
                        // Iterate through all rows
                        for(var i=0; i<scope.rows.length; i++){
                            // Add a blank column (string) in the desired location
                            scope.rows[i].splice(scope.selectedCol + 1, 0, '');
                        }
                    }
                    scope.lastChange = data;
                });
                
                // Add a column to the left of the selected column
                scope.$on('addColLeft', function(event, data){
                    if(scope.lastChange !== data){
                        // Iterate through all rows
                        for(var i=0; i<scope.rows.length; i++){
                            // Add a blank column (string) in the desired location
                            scope.rows[i].splice(scope.selectedCol, 0, '');
                        }
                    }
                    scope.lastChange = data;
                });
                
                // Delete a column
                scope.$on('deleteCol', function(event, data){
                    if(scope.lastChange !== data){
                        // Iterate through all rows
                        for(var i=0; i<scope.rows.length; i++){
                            // Delete the column in the desired location
                            scope.rows[i].splice(scope.selectedCol, 1);
                        }
                    }
                    scope.lastChange = data;
                });
                
                // Delete this table
                scope.$on('deleteTable', function(){
                    elm.remove();
                });
            }
        }
    };
}])

// Create/click an anchor link
.directive('anchor', ['$anchorScroll', '$location', function($anchorScroll, $location){
    return {
        link: function(scope, elm, attr){
            $anchorScroll();
            // Go to anchor
            elm.on('click', function(event){
                $location.hash(attr.anchor);
                $anchorScroll();
            });
        }
    };
}])

.controller('wysiwygCtrl', ['$scope', 'ngDialog', '$rootScope', 'Page', function($scope, ngDialog, $rootScope, Page){
    
    $scope.editor = {};
    $scope.editor.url = [];
    $scope.editor.text = [];
    $scope.editor.classes = [];
    $scope.editor.selected = '';
    $scope.editor.letter = 0;
    $scope.editor.rows = 5;
    $scope.editor.cols = 4;
    $scope.lastKeyPress;
    
    // Initialize text input with selection if available
    if(Page.misc.wysiwyg.selection)
        $scope.editor.text = Page.misc.wysiwyg.selection.split('');
    
    // Watch for pasted text
    angular.element(document).on('paste', function(event){
        var pastedText = event.originalEvent.clipboardData.getData('text/plain');
        $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 0, pastedText);
        $scope.editor.letter += pastedText.length;
        $scope.$apply();
        event.preventDefault();
    });
    
    // Watch all keypresses
    angular.element(document).on('keydown', function(event){
        
        // If the modal is open, log keypresses to the modal instead of the window
        if(Page.misc.wysiwyg.modalOpen){
            // Watch for paste commands
            if(($scope.lastKeyPress === 91 || $scope.lastKeyPress === 17) && event.keyCode === 86)
                return true;
            
            if(event.keyCode === 8) { // delete key
                $scope.editor.letter = $scope.editor.letter-1;
                $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 1);
            } else {
                var character = '';
                // Standard letter character
                if(event.keyCode >= 65 && event.keyCode <= 90){
                    character = String.fromCharCode(event.keyCode);
                    if(!event.shiftKey)
                        character = character.toLowerCase();
                } else if(event.keyCode >= 48 && event.keyCode <= 57){
                    // Number
                    if(!event.shiftKey)
                        character = String.fromCharCode(event.keyCode);
                    else {
                        // Punctuation above numbers
                        switch(event.keyCode){
                            case 48:
                                character = '!';
                                break;
                            case 49:
                                character = '@';
                                break;
                            case 50:
                                character = '#';
                                break;
                            case 51:
                                character = '$';
                                break;
                            case 52:
                                character = '%';
                                break;
                            case 53:
                                character = '^';
                                break;
                            case 54:
                                character = '&';
                                break;
                            case 55:
                                character = '*';
                                break;
                            case 56:
                                character = '(';
                                break;
                            case 57:
                                character = ')';
                                break;
                            default:
                                break;
                        }
                    }
                } else {
                    // Check for special characters
                    switch(event.keyCode){
                        
                        case 32:
                            character = ' ';
                            break;
                            
                        case 186: 
                            if(event.shiftKey)
                                character = ':';
                            else
                                character = ';';
                            break;
                        
                        case 187: 
                            if(event.shiftKey)
                                character = '+';
                            else
                                character = '=';
                            break;
                        
                        case 188: 
                            if(event.shiftKey)
                                character = '<';
                            else
                                character = ',';
                            break;
                        
                        case 189: 
                            if(event.shiftKey)
                                character = '_';
                            else
                                character = '-';
                            break;
                        
                        case 190: 
                            if(event.shiftKey)
                                character = '>';
                            else
                                character = '.';
                            break;
                        
                        case 191: 
                            if(event.shiftKey)
                                character = '?';
                            else
                                character = '/';
                            break;
                        
                        case 192: 
                            if(event.shiftKey)
                                character = '~';
                            else
                                character = '`';
                            break;
                        
                        case 219: 
                            if(event.shiftKey)
                                character = '{';
                            else
                                character = '[';
                            break;
                        
                        case 220: 
                            if(event.shiftKey)
                                character = '|';
                            else
                                character = '\\';
                            break;
                        
                        case 221: 
                            if(event.shiftKey)
                                character = '}';
                            else
                                character = ']';
                            break;
                        
                        case 222: 
                            if(event.shiftKey)
                                character = '"';
                            else
                                character = "'";
                            break;
                        
                        default:
                            break;
                    }
                }
                
                if(character !== '') {
                    $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 0, character);
                    $scope.editor.letter++;
                }
            }
            
            $scope.$apply();
            $scope.lastKeyPress = event.keyCode;
            if(event.keyCode !== 91 && event.keyCode !== 17) // Don't prevent Ctrl and Command keys
                event.preventDefault();
        }
    });
    
    // Watch for the modal closing
    $rootScope.$on('ngDialog.closed', function(event, data){
        // Make the user's keypresses go to the screen instead of the modal
        Page.misc.wysiwyg.modalOpen = false;
    });
    
    // Clicked an input-like div
    $scope.clicked = function(event, item) {
        $scope.editor.selected = item; // Keep track of which variable is being edited
        $scope.editor.letter = $scope.editor[$scope.editor.selected].length;
        event.preventDefault(); // Don't take focus of WYSIWYG word(s)
    };
    
    // Clicked a letter in that div
    $scope.clickedLetter = function(index) {
        $scope.editor.letter = index;
    };
    
    // Check the URL to activate the open in new tab box automatically
    $scope.urlChanged = function() {
        // Check if it's a file from the uploads folder. e.g. PDF files
        if($scope.editor.url.indexOf('/uploads/') === 0)
            $scope.editor.newTab = true;
    };
    
    // Insert a new link
    $scope.insertLink = function(){
        var newTab = '';
        var url = $scope.editor.url.join('');
        
        // Check if link should open in a new tab
        if($scope.editor.newTab)
            var newTab = '_blank';
        
        // If they meant to redirect to a url, make sure it has http://
        if(url.indexOf('www.') === 0)
            url = 'http://' + url;
        
        document.execCommand('insertHTML', false, '<a href="'+ url +'" target="'+ newTab +'" class="'+ $scope.editor.classes.join('') +'">'+ $scope.editor.text.join('') +'</a>');
        ngDialog.close();
    };
    
    // Insert a table
    $scope.createTable = function(){
        var timestamp = new Date().getTime();
        var rows = [];
        var cols = [];

        // Create empty columns
        for(var i=0; i<$scope.editor.cols; i++)
            cols.push('');
        // Create rows with columns
        for(var i=0; i<$scope.editor.rows; i++)
            rows.push(cols);

        Page.extras[timestamp] = rows;
        
        document.execCommand('insertHTML', false, '<div cosmo-table="'+ timestamp +'"></div>');
        ngDialog.close();
        $rootScope.$broadcast('saveAndRefresh');
    };
    
}])

.directive('wysiwyg', ['ngDialog', '$rootScope', 'Page', '$compile', '$timeout', function(ngDialog, $rootScope, Page, $compile, $timeout){
    return {
        templateUrl: 'core/html/wysiwyg/toolbar.html',
        replace: true,
        scope: {},
        link: function(scope, elm, attr){
            
            scope.editor = {};
            scope.editor.codeEditor = false;
            scope.editor.showToolbar = false;
            Page.misc.wysiwyg = {};
            
            // Turn the toolbar on and position it just above the mouse click
            scope.$on('activateWYSIWYG', function(event, data){
                // todo: figure out why sometimes this doesn't work without a timeout
                $timeout(function(){
                    scope.editor.showToolbar = true;
                }, 200);
                var remX = (data.pageX / 10) - 16; // -16 centers toolbar
                var remY = (data.pageY / 10); // Go directly above click. CSS margin pushes this above mouse
                elm.css('top', remY + 'rem');
                elm.css('left', remX + 'rem');
            });
            
            // Hide the toolbar
            scope.$on('hideWYSIWYG', function(){
                $timeout(function(){
                    scope.editor.showToolbar = false;
                }, 200);
            });
            
            // Open a modal window to create a link or a table
            scope.openModal = function(modal){
                
                // Save the cursor location and selection
                Page.misc.wysiwyg.selection = window.getSelection().toString();
                
                switch(modal){
                    case 'link':
                        ngDialog.open({ template: 'core/html/wysiwyg/link.html' });
                        Page.misc.wysiwyg.modalOpen = true;
                        break;
                        
                    case 'table':
                        ngDialog.open({ template: 'core/html/wysiwyg/table.html' });
                        Page.misc.wysiwyg.modalOpen = true;
                        break;
                    
                    default:
                        break;
                }
            };
            
            function parseTable(){
                var html = elm.contents()[3].innerHTML;
                var loc = scope.editor.focusLocation;
                var nextLoc = 0;
                while(nextLoc < loc && nextLoc !== -1){
                    var tableLoc = html.indexOf('<table>', nextLoc);
                    nextLoc = tableLoc;
                };
            };
            
            // User clicked a button on the toolbar
            scope.action = function(action){
                
                switch(action){
                    case 'bold':
                        document.execCommand('bold',false,null);
                        break;
                    case 'italic':
                        document.execCommand('italic',false,null);
                        break;
                    case 'strikethrough':
                        document.execCommand('strikethrough',false,null);
                        break;
                    case 'underline':
                        document.execCommand('underline',false,null);
                        break;
                    case 'unlink':
                        document.execCommand('unlink',false,null);
                        break;
                    case 'ol':
                        document.execCommand('insertOrderedList',false,null);
                        break;
                    case 'ul':
                        document.execCommand('insertUnorderedList',false,null);
                        break;
                    case 'indent':
                        document.execCommand('indent',false,null);
                        break;
                    case 'outdent':
                        document.execCommand('outdent',false,null);
                        break;
                    case 'left':
                        document.execCommand('justifyLeft',false,null);
                        break;
                    case 'right':
                        document.execCommand('justifyRight',false,null);
                        break;
                    case 'center':
                        document.execCommand('justifyCenter',false,null);
                        break;
                    case 'hr':
                        document.execCommand('insertHorizontalRule',false,null);
                        break;
                    case 'h1':
                        document.execCommand('formatBlock',false,'<h1>');
                        break;
                    case 'h2':
                        document.execCommand('formatBlock',false,'<h2>');
                        break;
                    case 'h3':
                        document.execCommand('formatBlock',false,'<h3>');
                        break;
                    case 'h4':
                        document.execCommand('formatBlock',false,'<h4>');
                        break;
                    case 'h5':
                        document.execCommand('formatBlock',false,'<h5>');
                        break;
                    case 'h6':
                        document.execCommand('formatBlock',false,'<h6>');
                        break;
                    case 'p':
                        document.execCommand('formatBlock',false,'<p>');
                        break;
                    case 'unformat':
                        document.execCommand('removeFormat',false,null);
                        break;
                    case 'addTableHeader':
                        $rootScope.$broadcast('addTableHeader', Math.round(new Date().getTime()/1000));
                        break;
                    case 'removeTableHeader':
                        $rootScope.$broadcast('removeTableHeader', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addRowAbove':
                        $rootScope.$broadcast('addRowAbove', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addRowBelow':
                        $rootScope.$broadcast('addRowBelow', Math.round(new Date().getTime()/1000));
                        break;
                    case 'deleteRow':
                        $rootScope.$broadcast('deleteRow', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addColRight':
                        $rootScope.$broadcast('addColRight', Math.round(new Date().getTime()/1000));
                        break;
                    case 'addColLeft':
                        $rootScope.$broadcast('addColLeft', Math.round(new Date().getTime()/1000));
                        break;
                    case 'deleteCol':
                        $rootScope.$broadcast('deleteCol', Math.round(new Date().getTime()/1000));
                        break;
                    case 'deleteTable':
                        $rootScope.$broadcast('deleteTable', Math.round(new Date().getTime()/1000));
                        break;
                    case 'table':
                        document.execCommand('insertHTML', false, '<div cosmo-table="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'photo':
                        document.execCommand('insertHTML', false, '<div image="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'audio':
                        document.execCommand('insertHTML', false, '<div audio="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'video':
                        document.execCommand('insertHTML', false, '<div movie="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'gallery':
                        document.execCommand('insertHTML', false, '<div gallery="'+ new Date().getTime() +'"></div>');
                        $rootScope.$broadcast('saveAndRefresh');
                        break;
                    case 'toggle':
                        $rootScope.$broadcast('toggleHTMLEditor');
                        break;
                        
                    default:
                        break;
                }
            };
        }
    };
}])

.filter('imageSize', function(){
    return function(input, quality){
        if(input && quality){
            input = input.toString(); // In case of $sce.trustAsUrl()
            if(input.indexOf('http') !== 0 && input.indexOf('//') !== 0)
                return input.replace(/\./, '-' + quality + '.');
            else
                return input;
        } else
            return input;
    };
})

.filter('responsive', function(){
    return function(input){
        if(input){
            input = input.toString(); // In case of $sce.trustAsUrl()
            if(window.innerWidth > 2024)
                return input; // use original image
            else if(window.innerWidth <= 2024)
                var quality = 2024;
            else if(window.innerWidth <= 1024)
                var quality = 1024;
            else if(window.innerWidth <= 512)
                var quality = 512;
            else if(window.innerWidth <= 320)
                var quality = 320;
            
            if(input.indexOf('http') !== 0 && input.indexOf('//') !== 0)
                return input.replace(/\./, '-' + quality + '.');
            else
                return input;
        } else
            return input;
    };
})

// Unix timestamp to date filter
.filter('timestamp', function() {
    return function(input) {
        var date = new Date(input * 1000);
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();

        return month + '/' + day + '/' + year;
    };
})


/****************************************************************************************************
 *                                             Controllers                                          *
 ****************************************************************************************************/



/**************************************************
 *             Admin Panel Controller             *
 **************************************************/

.controller('adminPanelCtrl', ['$scope', function($scope){
    
    $scope.admin = {};
    $scope.admin.sidebar = 'core/html/sidebar.html';
    $scope.sidebar = '';
    $scope.showAdminPanel = false; // Initialize sidebar as hidden
    
    // Log the user out
    $scope.logout = function(){
        // Delete cookies
        document.cookie = 'username=null; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'token=null; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        location.reload(); // Refresh the page
    };
    
}])

/**************************************************
 *             Block Controller                   *
 **************************************************/

.controller('blockCtrl', ['$scope', 'REST', 'growl', 'Page', function($scope, REST, growl, Page){
    
    var lastClicked;
    $scope.block = {};
    $scope.block.panel = 'manage';
    $scope.types = [];
    $scope.block.selectedTypes = {};
    
    // Get all available blocks
    REST.blocks.query({}, function(data){
        $scope.blocks = data;
    });
    
    // Get the page types available
    REST.themes.query({ themeID: 'KHP' }, function(data){
        for(var i=0; i<data.length; i++){
            if(data[i].type)
                $scope.types.push(data[i].type);
        }
    });
    
    $scope.$on('wysiwygEdit', function(event, data){
        $scope.block.html = data.html;
    });
    
    // Select a block
    $scope.selectBlock = function(block){
        $scope.block.id = block.id;
        $scope.block.name = block.name;
        $scope.block.html = block.block;
        Page.extras.none = block.block;
        Page.notifyObservers();
        
        if(block.priority)
            $scope.block.priority = block.priority;
        else
            $scope.block.priority = 0;
        $scope.block.area = block.area;
        $scope.block.panel = 'edit';
        
        // Get the block requirements
        REST.blocksRequirements.query({ blockID: $scope.block.id }, function(data){
            var blockURLs = '';
            for(var i=0; i<data.length; i++){
                if(data[i].type === 'visible' || data[i].type === 'invisible'){
                    $scope.block.visibility = data[i].type;
                    blockURLs += data[i].requirement + "\n";
                } else {
                    if(data[i].type)
                        $scope.block.selectedTypes[data[i].type] = true;
                }
            }
            $scope.block.urls = blockURLs;
        });
    };
    
    // Add a new block
    $scope.newBlock = function(){
        REST.blocks.save({ name: $scope.block.newName }, function(data){
            if($scope.blocks)
                $scope.blocks.push({ id: data, name: $scope.block.newName });
            else
                $scope.blocks = [{ id: data, name: $scope.block.newName }];
            
            $scope.block.newName = '';
            growl.addSuccessMessage("New Block Added");
        });
    };
    
    // Delete block
    $scope.deleteBlock = function(){
        REST.blocks.delete({ blockID: $scope.block.id }, function(data){
            if(data){
                for(var i=0; i< $scope.blocks.length; i++){
                    if($scope.blocks[i]['id'] === $scope.block.id)
                        $scope.blocks.splice(i,1);
                }
                $scope.block.name = '';
                growl.addSuccessMessage("Block Deleted");
            }
        });
    };
    
    // Update block section/priority from the overview section
    $scope.updateBlock = function(block){
        REST.blocks.update({ 
            blockID: block.id, 
            name: block.name, 
            block: block.block, 
            area: block.area, 
            priority: parseInt(block.priority) 
        }, function(data){
            growl.addSuccessMessage("Block Updated");
        });
    };
    
    // Save the addition/edits to the block
    $scope.saveBlock = function(){
        
        // Save block to database
        REST.blocks.update({ 
            blockID: $scope.block.id, 
            name: $scope.block.name, 
            block: $scope.block.html, 
            area: $scope.block.area, 
            priority: $scope.block.priority 
        }, function(data, headers){
            console.log(data);
            console.log(headers);
            // Update block name in CMS
            for(var i=0; i< $scope.blocks.length; i++){
                if($scope.blocks[i]['id'] === $scope.block.id)
                    $scope.blocks[i]['name'] = $scope.block.name;
            }
            
            // Delete old visibility requirements
            REST.blocksRequirements.delete({ blockID: $scope.block.id }, function(){
                // Save block visibility requirements
                if($scope.block.visibility){
                    var urls = $scope.block.urls.split("\n");
                    for(var i=0; i<urls.length; i++){
                        REST.blocksRequirements.save({
                            blockID: $scope.block.id,
                            type: $scope.block.visibility,
                            requirement: urls[i]
                        });
                    }
                }
                
                // Save block page type requirements
                for(var type in $scope.block.selectedTypes){
                    if($scope.block.selectedTypes[type]){
                        REST.blocksRequirements.save({
                            blockID: $scope.block.id,
                            type: 'type',
                            requirement: type
                        });
                    }
                }
            });
            
            growl.addSuccessMessage("Block Updated");
        });
    };
    
}])

/**************************************************
 *          Content List Controller               *
 **************************************************/
 
.controller('contentListCtrl', ['$scope', 'REST', function($scope, REST){
    REST.content.query({}, function(data){
        $scope.pages = data;
    });
}])

/**************************************************
 *              File Controller                   *
 **************************************************/

.controller('filesCtrl', ['$scope', '$upload', 'REST', '$rootScope', '$sce', 'ngDialog', '$filter', 'growl', function($scope, $upload, REST, $rootScope, $sce, ngDialog, $filter, growl){
    
    $scope.files = {};
    $scope.files.classes = '';
    $scope.files.size = 'original';
    $scope.numFiles = 12;
    
    // Open modal window
    if($scope.$parent.ngDialogData.gallery){
        $scope.images = $scope.$parent.ngDialogData.images;
        for(var i=0; i<$scope.images.length; i++){
            $scope.images[i].url = $sce.trustAsResourceUrl($scope.images[i].url);
        }
        $scope.files.gallery = true;
        $scope.editingGallery = true;
    }else {
        $scope.files.gallery = false;
        $scope.editingGallery = false;
    }
    
    $scope.id = $scope.$parent.ngDialogData.id;
    
    // Get files for the media library
    function getFiles(justUploaded){
        REST.files.query({}, function(data){
            $scope.media = [];
            for(var i=0; i<data.length; i++)
                $scope.media.push({
                    alt: data[i].alt,
                    class: data[i].class,
                    filename: $sce.trustAsResourceUrl(data[i].filename),
                    origFilename: data[i].filename,
                    href: data[i].href,
                    id: data[i].id,
                    title: data[i].title,
                    tags: data[i].tags,
                    type: data[i].type
                });
            if(justUploaded){
                $scope.viewFile($scope.media[0]);
                $rootScope.$broadcast('imageSaved', data[0]);
            }
        });
    }
    getFiles();
    
    // Autocomplete tags
    $scope.autocompleteTags = function(){
        var tag = $scope.files.tags[$scope.files.tags.length - 1];
        if(tag){
            REST.filesTags.get({ tag: tag }, function(data){
                if(data.status)
                    $scope.files.suggestions = data;
                else
                    $scope.files.suggestions = [];
            });
        } else 
            $scope.files.suggestions = [];
    };
    
    // Select tag from autocomplete
    $scope.selectSuggestion = function(tag){
        var tags = angular.copy($scope.files.tags);
        tags[tags.length - 1] = tag;
        tags[tags.length] = '';
        $scope.files.tags = tags;
        $scope.files.suggestions = [];
    };
    
    // Upload files
    $scope.onFileSelect = function($files) {
        //$files: an array of files selected, each file has name, size, and type.
        for (var i = 0; i < $files.length; i++) {
            var $file = $files[i];
            $scope.upload = $upload.upload({
                url: 'api/files', //upload.php script, node.js route, or servlet url
                method: 'POST',
                // headers: {'headerKey': 'headerValue'}, withCredential: true,
                data: {myObj: $scope.myModelObj},
                file: $file,
                //(optional) set 'Content-Desposition' formData name for file
                //fileFormDataName: myFile,
                progress: function(evt) {
                    
                }
            }).progress(function(evt) {
                $scope.progress = parseInt(100.0 * evt.loaded / evt.total) + '% Uploaded';
            }).success(function(data, status, headers, config) {
                // file is uploaded successfully
                getFiles(true);
                $scope.upload = false;
            });
        }
    };
    
    $scope.uploadFromUrl = function(){
        REST.files.save({ file: $scope.files.uploadURL }, function(){
            getFiles(true);
            $scope.upload = false;
        });
    };
    
    // View media data
    $scope.viewFile = function(file){
        // Check if coming from a gallery
        if(!file.filename)
           file.filename = file.url;
                
        $scope.selectedId = file.id;
        $scope.selectedFile = file.filename;
        $scope.origFilename = file.origFilename;
        $scope.files.title = file.title;
        $scope.files.href = file.href;
        $scope.files.alt = file.alt;
        $scope.files.class = file.class;
        $scope.files.tags = file.tags;
        $scope.files.type = file.type;
    };
    
    // Save title/tags to the file
    $scope.save = function(){
        REST.files.update({
            fileID: $scope.selectedId,
            title: $scope.files.title,
            href: $scope.files.href,
            tags: $scope.files.tags,
            alt: $scope.files.alt,
            class: $scope.files.class
        }, function(){
            growl.addSuccessMessage("File Updated");
        });
    };
    
    // Delete file
    $scope.deleteFile = function(){
        REST.files.delete({
            fileID: $scope.selectedId
        }, function(data){
            $scope.selectedFile = '';
            getFiles();
        });
    };
    
    // Save image gallery
    $scope.saveGallery = function(){
        $rootScope.$broadcast('choseGalleryFile', { id: $scope.id, data: $scope.images });
        ngDialog.close();
    };
    
    // Select media
    $scope.selectFile = function(){
        if($scope.files.size !== 'original')
            var fileName = $scope.origFilename.replace(/\./, '-'+$scope.files.size+'.');
        else
            var fileName = $scope.origFilename;
        
        if($scope.editingGallery){
            $scope.files.gallery = true;
            $scope.images.push({ 
                id: $scope.selectedId,
                title: $scope.files.title,
                alt: $scope.files.alt,
                tags: $scope.files.tags,
                type: $scope.files.type,
                url: fileName 
            });
        } else {
            $rootScope.$broadcast('choseFile', { 
                id: $scope.id,
                name: fileName,
                href: $scope.files.href,
                class: $scope.files.classes
            });
            ngDialog.close();
        }
    };
    
}])

/**************************************************
 *              Menu Controller                   *
 **************************************************/

.controller('menuCtrl', ['$scope', 'REST', 'growl', function($scope, REST, growl){
    
    var lastClicked;
    $scope.menu = {};
    $scope.menu.panel = 'manage';
    $scope.menu.editLink = true;
    
    // Get all available menus
    REST.menus.query({}, function(data){
        $scope.menus = data;
    });
    
    $scope.remove = function(scope) {
        if($scope.list.length>1){
            var index = scope.$index;
            if (index > -1) {
                scope.sortableModelValue.splice(index, 1)[0];
            }
        } else
            alert("You cannot have an empty menu");
    };
    
    $scope.newSubItem = function(scope) {
        var itemData = scope.itemData();
        itemData.items.push({
            id: itemData.id * 10 + itemData.items.length,
            title: itemData.title + '.' + (itemData.items.length + 1),
            url: '',
            items: []
        });
    };
    
    // Select a menu
    $scope.selectMenu = function(menu){
        $scope.menu.id = menu.id;
        $scope.menu.name = menu.name;
        $scope.menu.area = menu.area;
        $scope.menu.panel = 'edit';
        
        if(menu.menu)
            $scope.list = JSON.parse(menu.menu);
        else
            $scope.list = [{
                "id": 1,
                "title": "Link",
                "url": "",
                "items": []
              }];
    };
    
    $scope.options = {
        itemClicked: function (sourceItem) {
            $scope.menu.editLinkText = sourceItem.title;
            $scope.menu.editLinkURL = sourceItem.url;
            $scope.menu.selectedLink = sourceItem;
            $scope.$apply();
        }
    };
    
    // Add a new menu
    $scope.newMenu = function(){
        REST.menus.save({ name: $scope.menu.newName }, function(data){
            if($scope.menus)
                $scope.menus.push({ id: data, name: $scope.menu.newName });
            else
                $scope.menus = [{ id: data, name: $scope.menu.newName }];
            
            $scope.menu.newName = '';
        });
    };
    
    // Edit a menu's name
    $scope.updateMenuName = function(){
        REST.menus.update({ menuID: $scope.menu.id, name: $scope.menu.name, menu: $scope.menu.menu, area: $scope.menu.area }, function(data){
            if(data){
                for(var i=0; i< $scope.menus.length; i++){
                    if($scope.menus[i]['id'] === $scope.menu.id)
                        $scope.menus[i]['name'] = $scope.menu.name;
                }
                $scope.menu.name = '';
            }
        });
    };
    
    // Delete menu
    $scope.deleteMenu = function(){
        REST.menus.delete({ menuID: $scope.menu.id }, function(data){
            if(data){
                for(var i=0; i< $scope.menus.length; i++){
                    if($scope.menus[i]['id'] === $scope.menu.id)
                        $scope.menus.splice(i,1);
                }
                $scope.menu.name = '';
            }
        });
    };
    
    // Update link
    $scope.updateLink = function(){
        $scope.menu.selectedLink.title = $scope.menu.editLinkText;
        $scope.menu.selectedLink.url = $scope.menu.editLinkURL;
    };
    
    // Save the addition/edits to the menu
    $scope.saveMenu = function(){
        // Save menu
        REST.menus.update({ menuID: $scope.menu.id, name: $scope.menu.name, menu: JSON.stringify($scope.list), area: $scope.menu.area }, function(data){
            growl.addSuccessMessage("Menu Saved");
        });
    };
    
}])

/**************************************************
 *              Module Controller                 *
 **************************************************/

.controller('moduleCtrl', ['$scope', 'REST', 'growl', '$http', function($scope, REST, growl, $http){
    
    // Get modules
    REST.modules.query({}, function(data){
        $scope.modules = data;
    });
    
    // Activate Module
    $scope.activate = function(module, index){
        REST.modules.save({ module: module }, function(data){
            if(data)
                $scope.modules[index]['active'] = 'Y';
        });
    };
    
    // Deactivate Module
    $scope.deactivate = function(module, index){
        REST.modules.delete({ module: module }, function(data){
            if(data)
                $scope.modules[index]['active'] = 'N';
        });
    };
    
}])

/**************************************************
 *              Page Controller                   *
 **************************************************/

.controller('pageCtrl', ['$scope', 'REST', '$location', 'Page', '$rootScope', 'growl', '$routeParams', '$upload', function($scope, REST, $location, Page, $rootScope, growl, $routeParams, $upload){
    
    // Initialize variables
    $scope.page = {
        id: Page.id,
        title: Page.title,
        description: Page.description,
        url: Page.url,
        publish: Page.publish,
        scheduleDate: Page.scheduleDate,
        tags: Page.tags,
        type: Page.type,
        themePages: []
    };
    
    // Initialize schedule date
    var date = new Date(Page.scheduleDate * 1000);
    var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
    var ampm = date.getHours() > 12 ? 'PM' : 'AM';
    var formattedDate = date.getMonth() + 1 +'/'+ date.getDate() +'/'+ date.getFullYear() +' '+ hours +':'+ date.getMinutes() +' '+ ampm;
    $scope.page.scheduleDate = formattedDate;
    
    // Get the pages available to this theme
    REST.themes.query({ themeID: 'KHP' }, function(data){
        for(var i=0; i<data.length; i++){
            $scope.page.themePages.push({ name: data[i].type});
            if(data[i].type === Page.type)
                var index = i;
        }
        $scope.page.type = $scope.page.themePages[index];
    });
    
    // todo: Save Page.extras save locally too
    
    // Check if there's an unsaved version from a previous session
    var elements = ['title', 'description', 'publish', 'scheduleDate', 'header', 'subheader', 'body', 'url'];
    for(var i=0; i<elements.length; i++){
        if(localStorage.getItem($routeParams.url + elements[i]) !== Page[elements[i]] && localStorage.getItem($routeParams.url + elements[i]) !== 'null')
            $scope.newerVersion = true;
    }
    
    // Revert to the previously saved version
    $scope.localVersion = function(){
        
        var elements = ['title', 'description', 'publish', 'scheduleDate', 'header', 'subheader', 'body', 'url'];
        for(var i=0; i<elements.length; i++){
            // Restore item
            if(localStorage.getItem($routeParams.url + elements[i]) !== 'null')
                Page[elements[i]] = localStorage.getItem($routeParams.url + elements[i]);
            
            // Clear item from storage
            localStorage.setItem($routeParams.url + elements[i], null);
        }
        
        $scope.newerVersion = false;
        Page.notifyObservers();
    };
    
    // Delete newer version
    $scope.deleteNewerVersion = function(){
        var elements = ['title', 'description', 'publish', 'scheduleDate', 'header', 'subheader', 'body', 'url'];
        for(var i=0; i<elements.length; i++){
            localStorage.setItem($routeParams.url + elements[i], null);
        }
        
        $scope.newerVersion = false;
    };
    
    // Delete the page
    $scope.deletePage = function(){
        REST.content.delete({ contentID: $scope.page.id }, function(data){
            // Success message
            growl.addSuccessMessage("Deleted");
        });
        
        // Delete all revisions of this page
        REST.contentRevisions.delete({ contentID: $scope.page.id });
        
        // Delte all extra revisions
        REST.contentRevisionsExtras.delete({ contentID: $scope.page.id });
        
        // Delete all extras from this page
        REST.contentExtras.delete({ contentID: $scope.page.id });
        
        // Delete all tags for this page
        REST.contentTags.delete({ contentID: $scope.page.id });
        
        $location.path('new');
    };
    
    // Watch for page change
    var updatePage = function() {
        $scope.page.title = Page.title;
        $scope.page.description = Page.description;
        $scope.page.url = Page.url;
        if($scope.page.type)
            $scope.page.type.name = Page.type;
        $scope.page.tags = Page.tags;
    };
    Page.registerCallback(updatePage);
    Page.notifyObservers();
    
    // Auto-generate the url from the title
    $scope.titleChange = function(){
        // Only auto-generate urls for new pages
        if($scope.page.url === '/new' || $scope.page.url === '')
            $scope.autoURL = true;
        
        if($scope.autoURL){
            // Change spaces to hyphens, convert to lowercase, and remove punctuation
            $scope.page.url = $scope.page.title.toLowerCase().replace(/ /g, '-').replace(/[\.,\/#!$%\^&\*;:{}=_'~()]/g, '');
        }
    };
    
    $scope.notifyObservers = function(){
        Page.type = $scope.page.type.name;
        Page.notifyObservers();
    };
    
    // Update page variables when they are changed
    $scope.saveLocal = function(){
        Page.title = $scope.page.title;
        Page.description = $scope.page.description;
        Page.url = $scope.page.url;
        Page.type = $scope.page.type.name;
        
        // Save to local Storage
        localStorage.setItem($routeParams.url + 'title', Page.title);
        localStorage.setItem($routeParams.url + 'description', Page.description);
        localStorage.setItem($routeParams.url + 'url', Page.url);
        localStorage.setItem($routeParams.url + 'publish', Page.publish);
        localStorage.setItem($routeParams.url + 'scheduleDate', Page.scheduleDate);
        localStorage.setItem($routeParams.url + 'type', Page.type);
    };
    
    // Autocomplete tags
    $scope.autocompleteTags = function(){
        var tag = $scope.page.tags[$scope.page.tags.length - 1];
        if(tag){
            REST.filesTags.get({ tag: tag }, function(data){
                if(data.status)
                    $scope.page.suggestions = data;
                else
                    $scope.page.suggestions = [];
            });
        } else 
            $scope.page.suggestions = [];
    };
    
    // Select tag from autocomplete
    $scope.selectSuggestion = function(tag){
        var tags = angular.copy($scope.page.tags);
        tags[tags.length - 1] = tag;
        tags[tags.length] = '';
        $scope.page.tags = tags;
        $scope.page.suggestions = [];
    };
    
    // Save the page
    $scope.savePage = function(duplicate){
        
        if(duplicate && $scope.page.url === Page.url){
            alert('Error: URL must be different to duplicate a page');
            return;
        }
        
        // todo: Validate fields
        
        // If there's no custom title tag, use the header
        if($scope.page.title){
            if($scope.page.title.length === 0)
                $scope.page.title = Page.header;
        }
        
        // If there's no custom url, use the title
        if($scope.page.url.length === 0 || $scope.page.url === '/new'){
            var title = $scope.page.title.replace(/ /g, '-').toLowerCase;
            $scope.page.url = title;
        }
        
        var scheduleDate;
        if($scope.page.publish === 'Y' && Page.publish === 'Y') // If this was already published, don't update the published date
            scheduleDate = Page.scheduleDate;
        if($scope.page.publish === 'Y') // If publishing now, set the publish date to the current time
            scheduleDate = Math.round(+new Date()/1000);
        else if($scope.page.publish === 'schedule'){
            scheduleDate = Date.parse($scope.page.scheduleDate)/1000;
            // Check if this is back dated
            if(Date.parse($scope.page.scheduleDate) < Math.round(+new Date()))
                $scope.page.publish = 'Y';
            else
                $scope.page.publish = 'N';
        }
        
        // Create a new page. The "new" page has an id of 1
        if($scope.page.id === 1 || duplicate || Page.url === '/new'){
            
            // Save content
            REST.content.save({
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header, 
                subheader: Page.subheader, 
                body: Page.body,
                url: $scope.page.url, 
                type: $scope.page.type.name,
                published: $scope.page.publish,
                published_date: scheduleDate,
                author: 'admin' // todo: change to 'username' cookie
            }, function(data){
                var contentID = data.id;
                
                // Save new tags
                if($scope.page.tags){
                    for(var i=0; i<$scope.page.tags.length; i++){
                        REST.contentTags.save({ contentID: contentID, tag: $scope.page.tags[i] });
                    }
                }
                
                // Save page as a revision
                REST.contentRevisions.save({
                    contentID: contentID,
                    title: $scope.page.title,
                    description: $scope.page.description,
                    header: Page.header, 
                    subheader: Page.subheader, 
                    body: Page.body,
                    url: $scope.page.url, 
                    type: $scope.page.type.name,
                    published: $scope.page.publish,
                    published_date: $scope.page.scheduleDate,
                    author: 'admin' // todo: change to 'username' cookie
                }, function(data){
                    revisionID = data.id;
                    
                    // Save additional data
                    for (var key in Page.extras){
                        if(Page.extras.hasOwnProperty(key)){
                            // Check for galleries
                            if(Array.isArray(Page.extras[key])){
                                // Join array into comma deliniated string of file ids. e.g. 6,21,56
                                var galleryIds = '';
                                for(var i=0; i<Page.extras[key].length; i++){
                                    if(Page.extras[key][i].id)
                                        galleryIds += ',' + Page.extras[key][i].id;
                                }
                                Page.extras[key] = galleryIds.substr(1);
                            }
                            
                            // Save extra
                            REST.contentExtras.save({
                                contentID: contentID,
                                name: key,
                                extra: Page.extras[key]
                            });
                            
                            // Save extra to revisions
                            REST.contentRevisionsExtras.save({
                                revisionID: revisionID,
                                contentID: $scope.page.id,
                                name: key,
                                extra: Page.extras[key]
                            });
                        }
                    }
                
                });
                
                // Success message
                growl.addSuccessMessage("Saved");
                // Redirect to new page
                $location.path($scope.page.url);
            });
        } else { // Update existing page
            
            var revisionID;
            
            REST.content.update({
                contentID: $scope.page.id,
                title: $scope.page.title,
                description: $scope.page.description,
                header: Page.header, 
                subheader: Page.subheader, 
                body: Page.body,
                url: $scope.page.url, 
                type: $scope.page.type.name,
                published: $scope.page.publish,
                published_date: scheduleDate,
                author: 'admin' // todo: change to 'username' cookie
            }, function(data){
                
                // Delete old tags
                REST.contentTags.delete({ contentID: $scope.page.id }, function(){
                    // Save new tags
                    if($scope.page.tags){
                        for(var i=0; i<$scope.page.tags.length; i++){
                            REST.contentTags.save({ contentID: $scope.page.id, tag: $scope.page.tags[i] });
                        }
                    }
                });
                
                // Save page as a revision
                REST.contentRevisions.save({
                    contentID: $scope.page.id,
                    title: $scope.page.title,
                    description: $scope.page.description,
                    header: Page.header, 
                    subheader: Page.subheader, 
                    body: Page.body,
                    url: $scope.page.url, 
                    type: $scope.page.type.name,
                    published: $scope.page.publish,
                    published_date: $scope.page.scheduleDate,
                    author: 'admin' // todo: change to 'username' cookie
                }, function(data){
                    revisionID = data.id;
                    
                    // Delete old extras
                    REST.contentExtras.delete({ contentID: $scope.page.id }, function(){
                        // Save additional data
                        for (var key in Page.extras){
                            if (Page.extras.hasOwnProperty(key)){
                                
                                // Check for galleries
                                if(Array.isArray(Page.extras[key])){
                                    // Join array into comma deliniated string of file ids. e.g. 6,21,56
                                    var galleryIds = '';
                                    for(var i=0; i<Page.extras[key].length; i++){
                                        if(Page.extras[key][i].id)
                                            galleryIds += ',' + Page.extras[key][i].id;
                                    }
                                    Page.extras[key] = galleryIds.substr(1);
                                }
                                
                                // Save new extra
                                REST.contentExtras.save({
                                    contentID: $scope.page.id,
                                    name: key,
                                    extra: Page.extras[key]
                                });

                                // Save new extra to revisions
                                REST.contentRevisionsExtras.save({
                                    revisionID: revisionID,
                                    contentID: $scope.page.id,
                                    name: key,
                                    extra: Page.extras[key]
                                });
                            }
                        }
                        // Success message
                        growl.addSuccessMessage("Page Updated");
                    });
                    
                });
                
                // Redirect to new page
                $location.path($scope.page.url);
            });
        }
        
    };
}])

/**************************************************
 *            Revisions Controller                *
 **************************************************/

.controller('revisionsCtrl', ['$scope', 'REST', 'Page', function($scope, REST, Page){
    
    // Get all revisions for this url
    REST.contentRevisions.query({ contentID: Page.id }, function(data){
        $scope.revisions = data;
    });
    
    // Get the file clicked and the previous version
    $scope.getRevision = function(index){
        var current = $scope.revisions[index];
        var previous = $scope.revisions[index+1];
        
        Page.title = $scope.compare(previous.title, current.title).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.description = $scope.compare(previous.description, current.description).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.body = $scope.compare(previous.body, current.body).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.header = $scope.compare(previous.header, current.header).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        Page.subheader = $scope.compare(previous.subheader, current.subheader).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        
        Page.notifyObservers();
    };
    
    // Set the source file
    $scope.compare = function(previous, current){
        if(!current)
            current = '';
        if(!previous)
            previous = '';
        
        var dmp = new diff_match_patch();
        var d = dmp.diff_main(previous, current);
        dmp.diff_cleanupSemantic(d);
        return dmp.diff_prettyHtml(d);
    };
    
    // Revert to previous edition
    $scope.revert = function(index){
        REST.contentRevisions.save({ revisionID: $scope.revisions[index].id }, function(){
            
        });
    };
    
}])

/**************************************************
 *               Roles Controller                 *
 **************************************************/

.controller('rolesCtrl', ['$scope', 'REST', 'growl', function($scope, REST, growl){
    
    var resources = ['blocks', 'comments', 'content', 'files', 'menus', 'modules', 'roles', 'users'];
    var resourcesIds = {
        blocks: 0,
        comments: 1,
        content: 2,
        files: 3,
        menus: 4,
        modules: 5,
        roles: 6,
        users: 7
    };
    
    $scope.role = {};
    $scope.rolePanel = 'manage';
    $scope.role.id = false;
    $scope.role.permissions = [];
    
    // Initialize everything to false
    for(var i=0; i<resources.length; i++){
        $scope.role.permissions.push({
            name: resources[i],
            read: false,
            write: false,
            update: false,
            delete: false
        });
    }
    
    // Get roles
    REST.roles.query({},function(data){
        $scope.roles = data;
    });
    
    // Select a role
    $scope.selectRole = function(role){
        $scope.role.id = role.id;
        $scope.role.name = role.name;
        $scope.rolePanel = 'edit';
        
        REST.rolesPermissions.query({ roleID: $scope.role.id }, function(data){
            if(data && data !== 'null'){
                for(var i=0; i<data.length; i++){
                    if(data[i].permission === 'read')
                        $scope.role.permissions[resourcesIds[data[i].resource]].read = true;
                    if(data[i].permission === 'write')
                        $scope.role.permissions[resourcesIds[data[i].resource]].write = true;
                    if(data[i].permission === 'update')
                        $scope.role.permissions[resourcesIds[data[i].resource]].update = true;
                    if(data[i].permission === 'delete')
                        $scope.role.permissions[resourcesIds[data[i].resource]].delete = true;
                }
            }
        });
    };
    
    // Add a new role
    $scope.newRole = function(){
        REST.roles.save({ name: $scope.role.newName }, function(data){
            if($scope.roles)
                $scope.roles.push({ id: data.id, name: $scope.role.newName });
            else
                $scope.roles = [{ id: data.id, name: $scope.role.newName }];
            
            $scope.role.newName = '';
        });
    };
    
    // Edit a role's name
    $scope.updateRoleName = function(){
        REST.roles.update({ roleID: $scope.role.id, name: $scope.role.name }, function(data){
            if(data){
                for(var i=0; i< $scope.roles.length; i++){
                    if($scope.roles[i]['id'] === $scope.role.id)
                        $scope.roles[i]['name'] = $scope.role.name;
                }
                $scope.role.name = '';
            }
        });
    };
    
    // Delete role
    $scope.deleteRole = function(){
        REST.roles.delete({ roleID: $scope.role.id }, function(data){
            if(data){
                for(var i=0; i< $scope.roles.length; i++){
                    if($scope.roles[i]['id'] === $scope.role.id)
                        $scope.roles.splice(i,1);
                }
                $scope.role.name = '';
            }
        });
        
        $scope.rolePanel = 'manage';
    };
    
    // Save the changed permissions to the role
    $scope.saveRoles = function(){
        
        // Update role name
        REST.roles.update({ roleID: $scope.role.id, name: $scope.role.name });
        
        // Delete old permissions
        REST.rolesPermissions.delete({ roleID: $scope.role.id }, function(){
            // Save permissions
            for(var i=0; i < $scope.role.permissions.length; i++){
                var name = $scope.role.permissions[i].name;
                
                // Check which permissions have been selected
                if($scope.role.permissions[i].read)
                    REST.rolesPermissions.save({ roleID: $scope.role.id, resource: name, permission: 'read' });
                if($scope.role.permissions[i].write)
                    REST.rolesPermissions.save({ roleID: $scope.role.id, resource: name, permission: 'write' });
                if($scope.role.permissions[i].update)
                    REST.rolesPermissions.save({ roleID: $scope.role.id, resource: name, permission: 'update' });
                if($scope.role.permissions[i].delete)
                    REST.rolesPermissions.save({ roleID: $scope.role.id, resource: name, permission: 'delete' });   
            }
            growl.addSuccessMessage("Roles Updated");
        });
    };
}])

/**************************************************
 *             Settings Controller                *
 **************************************************/
 
.controller('settingsCtrl', ['$scope', 'REST', 'growl', function($scope, REST, growl){
    
    // Save settings
    $scope.changeSettings = function(){
        REST.settings.save({ 
            siteName: $scope.siteName, 
            slogan: $scope.slogan,
            logo: $scope.logo,
            email: $scope.email
        }, function(data){
            growl.addSuccessMessage("Settings Updated");
        });
    };
    
}])

/**************************************************
 *              Tags Controller                   *
 **************************************************/

.controller('tagsCtrl', ['$scope', 'REST', 'growl', function($scope, REST, growl){
    
    $scope.tags = {};
    
    // Get all available menus
    $scope.getTags = function(){
        REST.filesTags.get({ tag: '' }, function(data){
            $scope.tags.tags = data;
        });
    };
    $scope.getTags();
    
    // Edit a menu's name
    $scope.updateTag = function(){
        REST.filesTags.update({ tag: $scope.tags.selectedTags, newTag: $scope.tags.newTag }, function(data){
            $scope.getTags();
        });
    };
    
    // Delete menu
    $scope.deleteTag = function(){
        $scope.tags.selectedTag;
        $scope.tags.newTag;
        REST.filesTags.delete({ tag: $scope.tags.selectedTag }, function(data){
            $scope.getTags();
        });
    };
    
}])

/**************************************************
 *              Themes Controller                 *
 **************************************************/

.controller('themeCtrl', ['$scope', 'REST', '$http', function($scope, REST, $http){
    // Get all themes
    REST.themes.query({}, function(data){
        $scope.themes = data;
    });
    
    // Select theme
    $scope.selectTheme = function(theme){
        $scope.selectedTheme = theme;
        $http.get('themes/' + theme + '/preview.jpg').success(function(data, status){
            if(data[0] === '<')
                $scope.themePreview = '';
            else
                $scope.themePreview = 'themes/' + theme + '/preview.jpg';
        });
    };
    
    // Change the theme
    $scope.changeTheme = function(){
        REST.themes.save({ theme: $scope.selectedTheme }, function(data){
            location.reload();
        });
    };
    
}])

/**************************************************
 *               Users Controller                 *
 **************************************************/

.controller('usersCtrl', ['$scope', 'REST', 'growl', function($scope, REST, growl){
    
    // Initialize variables
    $scope.users = {};
    $scope.users.selectedRoles = [];
    
    // Get users
    REST.users.query({}, function(data){
        $scope.users.data = data;
    });
    
    // Get roles
    REST.roles.query({},function(data){
        $scope.roles = data;
    });
    
    // Select User
    $scope.selectUser = function(user){
        $scope.selectedUser = user;
        // Get roles assigned to user
        REST.usersRoles.query({ userID: $scope.selectedUser.id }, function(data){
            $scope.checkedRole = {};
            for(var i=0; i<data.length; i++)
                $scope.checkedRole[data[i][0]] = true;
        });
    };
    
    // Search user's database
    $scope.search = function(){
        // Clear results
        $scope.users.data = [];
        
        // Populate new results
        REST.usersRoles.query({ keyword: $scope.users.search }, function(data){
            $scope.users.data = data;
        });
    };
    
    // Save changes to a user's roles
    $scope.save = function(){
        
        // Delete all current roles for this user
        REST.usersRoles.delete({ userID: $scope.selectedUser.id }, function(){
            // Save new roles assigned to this user
            for(var i=0; i<$scope.users.selectedRoles.length; i++){
                if($scope.users.selectedRoles[i]){
                    REST.usersRoles.save({ userID: $scope.selectedUser.id, roleID: $scope.users.selectedRoles[i] }, function(data){

                    });
                }
            }
        });
    };
    
    // Delete user
    $scope.delete = function(){
        // Delete all current roles for this user
        REST.usersRoles.delete({ userID: $scope.selectedUser.id });
        
        // Delete user
        REST.usersRoles.delete({ userID: $scope.selectedUser.id });
    };
    
}])











/****************************************************************************************************
 *                                              Directives                                          *
 ****************************************************************************************************/



/**************************************************
 *           Admin Panel Directive                *
 **************************************************/

.directive('adminpanel', function(){
    return {
        templateUrl: 'core/html/admin-panel.html'
    };
})





/****************************************************************************************************
 *                                           Filters                                                *
 ****************************************************************************************************/




// Format theme html files into user-friendly page options
.filter('themeFiles', function(){
    return function(input){
        
        if(input){
            // Remove .html extension
            var output = input.replace(/\.html/g,' ');
            // Replace hyphens with spaces
            output = output.replace(/\-/g,' ');
            // Capitalize the first letter of every word
            output = output.replace(/\b./g, function(m){ return m.toUpperCase(); });

            return output;
        } else
            return input;
    };
})

/*
.directive("compile", ['$compile', '$timeout', 'Page', function ($compile, $timeout, Page) {
    return {
        link: function(scope, elem, attr){
            
            // Get the compiled HTML when saving the page
            scope.$on('savingPage', function() {
                
                var compiledHTML = $compile(elem.contents())(scope, function(clonedElement, scope) {
                    // console.log(clonedElement[2].outerText);
                });
                
                var returnString = '<html>';
                for(var i=0; i<compiledHTML.length; i++){
                    if(compiledHTML[i].outerHTML)
                        returnString += compiledHTML[i].outerHTML;
                }
                returnString += '</html>';
                
                // Save to the page global variable
                Page.compiledHTML = returnString;
                
            });
        }
    };
}])
*/