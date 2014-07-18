'use strict';
angular.module('cosmoMain', [])

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
                
                // Check if the modal is open. If so, sent keypress, don't change WYSIWYG editor yet
                /*
                elm.on('keydown', function(event) {
                    if(Page.misc.wysiwyg.modalFocus){
                        console.log(event.keyCode);
                        event.preventDefault();
                    }
                });
                
                angular.element(window).on('keydown', function(event) {
                    if(Page.misc.wysiwyg.modalFocus){
                        console.log(event.keyCode);
                        event.preventDefault();
                    }
                });
                */
                
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
                /*
                // Keep track of where the user clicked in the div
                elm.on('click', function(event){
                    var charCount = 0;
                    var exists = false;
                    for(var i=0; i<elm.contents().length; i++){
                        if(event.target === elm.contents()[i]){
                            charCount += event.target.outerHTML.indexOf(window.getSelection().getRangeAt(0).commonAncestorContainer.nodeValue.slice(0, -1));
                            exists = true;
                            break;
                        } else
                            charCount += elm.contents()[i].outerHTML.length;
                    }
                    charCount += window.getSelection().focusOffset;
                    
                    if(!exists)
                        charCount = elm.html().indexOf(event.target.outerHTML) + event.target.outerHTML.indexOf(event.target.innerHTML) + event.target.innerHTML.length;
                    
                    Page.misc.wysiwyg.focusLocation = charCount;
                });
                */
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
            if(data.token){
                // Set cookie and headers with username and auth token
                var expdate = new Date();
                expdate.setDate(expdate.getDate() + 90); // 90 days in the future
                document.cookie= "username=" + $scope.login.username + ";expires=" + expdate.toGMTString();
                document.cookie= "token=" + data.token + ";expires=" + expdate.toGMTString();
                
                $http.defaults.headers.common['username'] = $scope.login.username;
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
});