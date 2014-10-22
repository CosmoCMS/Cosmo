describe('Filters', function() {
    var $filter;
    
    // Load the myApp module, which contains the directive
    beforeEach(module('cosmo'));

    // Store references to $rootScope and $compile
    // so they are available to all tests in this describe block
    beforeEach(inject(function(_$filter_){
        // The injector unwraps the underscores (_) from around the parameter names when matching
        $filter = _$filter_;
    }));

    it('Removes all HTML tags leaving just text', function() {
        expect($filter('plaintext')('abc')).toEqual('abc');
        expect($filter('plaintext')('<h1>abc</h1>')).toEqual('abc');
    });
    
    it('Turns a string into Title Case', function() {
        expect($filter('titlecase')('this is a title')).toEqual('This is a Title');
        expect($filter('titlecase')('THIS IS ALSO A TITLE')).toEqual('This is also a Title');
    });
    
    it('Turns an image filename into a smaller sized photo', function() {
        expect($filter('imageSize')('image.jpg', 512)).toEqual('image-512.jpg');
        expect($filter('imageSize')('second-image.jpg', 1024)).toEqual('second-image-1024.jpg');
    });
    
    it('Turns theme html files into pretty human-readable strings', function() {
        expect($filter('themeFiles')('first-page.html')).toEqual('First Page');
    });
});

describe('Directives', function() {
    var $compile;
    var $rootScope;
    var Page;
    
    beforeEach(module('cosmo'));
    beforeEach(module('ngDialog'));

    beforeEach(inject(function(_$compile_, _$rootScope_, _Page_){
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        Page = _Page_;
    }));
    
    it('fluidvids', function() {
        var element = $compile("<div fluidvids='video.mpg'></div>")($rootScope);
        $rootScope.$digest();
        expect(element.html()).toEqual("<iframe></iframe>");
    });
    
    it('csBgImage', function() {
        Page.extras['uniqueid'] = {src: 'image.jpg'};
        var element = $compile("<img cs-bg-image='uniqueid'>")($rootScope);
        $rootScope.$digest();
        expect(element.attr('style')).toContain("background-image:");
        expect(element.attr('style')).toContain("image.jpg");
    });
    
    it('csLogo', function() {
        Page.settings = {};
        Page.settings.logo = 'image.jpg';
        var element = $compile("<img cs-logo>")($rootScope);
        $rootScope.$digest();
        expect(element.attr('src')).toEqual("image.jpg");
    });
    
    it('csNotification', function() {
        Page.settings = {};
        Page.settings.site_name = 'Title';
        var element = $compile("<div cs-title></div>")($rootScope);
        $rootScope.$digest();
        expect(element.html()).toEqual("<a href=\"/\">Title</a>");
    });
    
});