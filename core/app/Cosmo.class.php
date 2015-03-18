<?php

/**
 * Cosmo class provides core functionality of the CMS
 */

class Cosmo {

    private $pdo;
    private $prefix;
    private $salt;
    private $thumbnailSizes = array(320, 512, 1024, 2048);

    public function __construct(PDO $pdo, $prefix, $salt=null)
    {
        $this->pdo = $pdo;
        $this->prefix = $prefix;
        $this->salt = $salt;
    }

    ##################################################
    #                   Blocks                       #
    ##################################################

    /**
     * Create a new block
     * @param str name Name of the new block
     * @return mixed Returns last insert ID on success. False on fail.
     */
    public function blocksCreate($name)
    {
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'blocks (name) VALUES (?)');
        $data = array($name);
        if($stmt->execute($data))
            return $this->pdo->lastInsertId();
        else
            return FALSE;
    }

    /**
     * Fetch blocks
     * @param int Block ID
     * @param str Page type. e.g. home.html
     * @param str URL
     * @return array Array with names 'id', 'name', 'block', 'priority', and 'area'
     */
    public function blocksRead($blockID=NULL, $pageType=NULL, $url=NULL){
        // Get a specific block
        if($blockID){
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'blocks WHERE id=?');
            $data = array($blockID);
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $row = $stmt->fetch();
            $blocks = $row['block'];
        } else if($pageType || $url){ // Get all blocks for this page
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'blocks ORDER BY priority DESC');
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $blocks = array();
            while($row = $stmt->fetch())
            {
                $blockID = $row['id'];
                $name = $row['name'];
                $block = $row['block'];
                $priority = $row['priority'];
                $area = $row['area'];
                $pagePass = TRUE;
                $typePass = TRUE;
                $skip = FALSE;
                $typeSkip = FALSE;

                // Get requirements
                $stmt2 = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'blocks_requirements WHERE blocks_id=?');
                $data2 = array($blockID);
                $stmt2->execute($data2);
                $stmt2->setFetchMode(PDO::FETCH_ASSOC);
                if($stmt2->rowCount())
                {
                    // Iterate through each requirement
                    while($row2 = $stmt2->fetch())
                    {
                        $requirement = $row2['requirement'];

                        // Check if requirement was met
                        switch($row2['type'])
                        {
                            // Show only on these pages:
                            case 'visible':
                                // Check for a wildcard at the end of this requirement
                                if(strpos($requirement, '*') === strlen($requirement)-1)
                                {
                                    // Check if the URL starts with the requirement
                                    if(strpos($url, substr($requirement, 0, strlen($requirement)-1)) === 0 && !$skip)
                                    {
                                        $pagePass = TRUE;
                                        $skip = TRUE;
                                    } else if(!$skip)
                                        $pagePass = FALSE;

                                } else if($requirement === $url && !$skip) // User is on an allowed page. Skip further checks.
                                {
                                    $pagePass = TRUE;
                                    $skip = TRUE;
                                } else if(!$skip) // This page doesn't match this requirement.
                                    $pagePass = FALSE;

                                break;

                            // Show on all pages except these:
                            case 'invisible':
                                // Check for a wildcard at the end of this requirement
                                if(strpos($requirement, '*') === strlen($requirement)-1)
                                {
                                    // Check if the URL starts with the requirement
                                    if(strpos($url, substr($requirement, 0, strlen($requirement)-1)) === 0)
                                        $pagePass = FALSE;

                                } else if($requirement === $url)
                                    $pagePass = FALSE;

                                break;

                            // Show only for this type
                            case 'type':
                                if($requirement === $pageType && !$typeSkip)
                                {
                                    $typePass = TRUE;
                                    $typeSkip = TRUE;
                                } else if(!$typeSkip)
                                    $typePass = FALSE;

                                break;

                            default:
                                break;
                        }
                    }

                    // If block passes requirements, include in array
                    if($pagePass && $typePass)
                        $blocks[] = array('name'=>$name, 'block'=>$block, 'priority'=>$priority, 'area'=>$area);

                } else // No requirements
                    $blocks[] = array('name'=>$name, 'block'=>$block, 'priority'=>$priority, 'area'=>$area);
            }
        } else { // Get all blocks
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'blocks');
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $blocks = array();
            while($row = $stmt->fetch())
                $blocks[] = $row;
        }

        return $blocks;
    }

    /**
     * Save a block in HTML
     * @param string $block Block HTML
     * @return boolean
     */
    public function blocksUpdate($name, $block, $priority, $area, $blockID)
    {
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'blocks SET name=?, block=?, priority=?, area=? WHERE id=?');
        $data = array($name, $block, $priority, $area, $blockID);
        return $stmt->execute($data);
    }

    /**
     * Delete a block
     * @param int $blockID Block ID
     * @return boolean
     */
    public function blocksDelete($blockID)
    {
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'blocks WHERE id=?');
        $data = array($blockID);
        return $stmt->execute($data);
    }

    ##################################################
    #              Block Requirements                #
    ##################################################

    /**
     * Add a new requirement to a block
     * @param int $blockID Block id
     * @param string $type Type of requirement. 'visible' (for URLs), 'invisible' (for URLs), or 'restrict' (for page types)
     * @param string $requirement URL or page type
     * @return boolean
     */
    public function blocksRequirementsCreate($blockID, $type, $requirement){
        if($blockID && $requirement !== '')
        {
            if($type === 'visible' || $type === 'invisible')
            {
                // Make sure URLs start with a slash '/'
                if(strpos($requirement, '/') !== 0)
                    $requirement = '/' + $requirement;
            }
            $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'blocks_requirements (blocks_id, type, requirement) VALUES (?,?,?)');
            $data = array($blockID, $type, $requirement);
            return $stmt->execute($data);
        } else
            return FALSE;
    }

    /**
     * Fetch all block requirements
     * @param int $blockID Block id
     * @return array Array with block requirement columns 'id', 'blocks_id', 'type', and 'requirement'
     */
    public function blocksRequirementsRead($blockID){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'blocks_requirements WHERE blocks_id=?');
        $data = array($blockID);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $requirements = array();
        while($row = $stmt->fetch())
            $requirements[] = $row;

        return $requirements;
    }

    /**
     * Update a requirement for a block to be displayed
     * @param int $requirementID Requirement id
     * @param int $blockID Block id
     * @param string $type Type of requirement. 'visible' (for URLs), 'invisible' (for URLs), or 'restrict' (for page types)
     * @param string $requirement URL or page type
     * @return boolean
     */
    public function blocksRequirementsUpdate($requirementID, $blockID, $type, $requirement){
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'blocks_requirements SET blocks_id=?, type=?, requirement=? WHERE id=?');
        $data = array($blockID, $type, $requirement, $requirementID);
        return $stmt->execute($data);
    }

    /**
     * Delete all requirements for a given block
     * @param int $blockID Block id to delete
     * @return boolean
     */
    public function blocksRequirementsDelete($blockID){
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'blocks_requirements WHERE blocks_id=?');
        $data = array($blockID);
        return $stmt->execute($data);
    }

    ##################################################
    #                 Comments                       #
    ##################################################

    /**
     * Create a new comment
     * @param int $contentID Content id
     * @param int $parentID ID of parent comment (if applicable)
     * @param str $name Name
     * @param str $email Email
     * @param str $comment Comment
     * @return mixed Returns inserted id on success, false on fail.
     */
    public function commentsCreate($contentID, $path=NULL, $name=NULL, $email=NULL, $comment=NULL)
    {
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'comments (content_id, path, name, email, comment, timestamp) VALUES (?,?,?,?,?,?)');
        $data = array($contentID, $path, $name, $email, $comment, time() * 1000);
        if($stmt->execute($data))
            return $this->pdo->lastInsertId();
        else
            return FALSE;
    }

    /**
     * Fetch all the comments from a given page
     * @param int $id Id of the page you want to query
     * @return array Array of comments
     */
    public function commentsRead($id){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'comments WHERE content_id=?');
        $data = array($id);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $comments = array();
        while($row = $stmt->fetch())
            $comments[] = $row;

        return $comments;
    }

    /**
     * Update a comment
     * @param int $commentID Content ID
     * @param str $comment Comment
     * @return boolean
     */
    public function commentsUpdate($id, $comment)
    {
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'comments SET comment=? WHERE id=?');
        $data = array($id, $comment);
        return $stmt->execute($data);
    }

    /**
     * Delete a block
     * @param int $blockID Block ID
     * @return boolean
     */
    public function commentsDelete($id)
    {
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'comments SET comment=? WHERE id=?');
        $data = array($id, 'This comment has been deleted');
        return $stmt->execute($data);
        /* don't delete sub threads?
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'comments WHERE id=?');
        $data = array($id);
        return $stmt->execute($data);
         */
    }

    ##################################################
    #                   Content                      #
    ##################################################

    /**
     * Create a new page
     * @param str $title
     * @param str $description
     * @param str $header
     * @param str $subheader
     * @param str $body
     * @param str $url
     * @param str $compiledHTML Compiled HTML of the entire page for the snapshot
     * @param str $type Type of page. e.g. 'blog.html', or 'page.html'
     * @param str $published 'Y' or 'N'
     * @param str $publishedDate Date the article was published on
     * @return boolean
     */
    public function contentCreate($title, $description, $header, $subheader, $featured, $body, $url, $author, $type, $published='Y', $publishedDate=null){
        // Make sure URL starts with a slash '/'
        if(strpos($url, '/') !== 0)
            $url = '/' . $url;

        // If this post is scheduled to publish immediately, set the published date to now
        if(!$publishedDate)
            $publishedDate = time();
        
        // Save to database
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'content (title, description, header, subheader, featured, body, url, type, published, published_date, author, timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
        $data = array($title, $description, $header, $subheader, $featured, $body, $url, $type, $published, $publishedDate, $author, time());
        if($stmt->execute($data))
            return $this->pdo->lastInsertId();
        else
            return FALSE;
    }

    /**
     * Get the page content for the specified URL
     * @param string URL
     * @param boolean TRUE if the user is an administrator and can view unpublished content
     * @return array Returns an array of all available page fields
     */
    public function contentRead($url=NULL, $admin=NULL){
        if($url)
        {
            // Remove the prefix from the URL
            if(!empty($this->prefix)){
                $prefix = substr($this->prefix, 0, strlen($this->prefix)-1); // Remove trailing slash '/'
                $url = str_replace ($prefix, '', $url);
            }

            // Lookup page in URL
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'content WHERE url=?');
            $data = array($url);
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $row = $stmt->fetch();

            // Make sure page exists and is published, or user is an administrator
            if($row && ($row['published'] === 'Y' || $admin))
            {
                // Get extras
                $extras = self::contentExtrasRead($row['id']);
                $tags = self::contentTagsRead($row['id']);
                if($row['url'] === '/')
                    $url = '/';
                else
                    $url = substr($row['url'], 1); // Remove first slash '/' to make the URL relative for sites in subfolders

                return array(
                    'id' => $row['id'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'header' => $row['header'],
                    'subheader' => $row['subheader'],
                    'featured' => $row['featured'],
                    'body' => $row['body'],
                    'url' => $url,
                    'published' => $row['published'],
                    'published_date' => $row['published_date'],
                    'tags' => $tags,
                    'type' => $row['type'],
                    'author' => self::usersRead($row['author']),
                    'timestamp' => $row['timestamp'],
                    'extras' => $extras
                );
            } else if($row['published'] === 'N'){
                return FALSE;
            } else {
                // See if URL changed, if so, redirect the user to the new page
                $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'revisions WHERE url=? LIMIT 1');
                $data = array($url);
                $stmt->execute($data);
                $stmt->setFetchMode(PDO::FETCH_ASSOC);
                if($row = $stmt->fetch())
                {
                    // Grab new URL
                    $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'content WHERE id=?');
                    $data = array($row['content_id']);
                    $stmt->execute($data);
                    $stmt->setFetchMode(PDO::FETCH_ASSOC);
                    if($row = $stmt->fetch()) // Updated the URL
                        return array('redirect' => $row['url']);
                    else // Deleted the page
                        return FALSE;
                } else
                    return FALSE;
            }
        } else // List all pages except the home page and new page
        {
            $stmt = $this->pdo->prepare('SELECT id, title, description, header, subheader, featured, url, type, published, published_date, author, timestamp FROM '.$this->prefix.'content WHERE url!=? AND url!=? ORDER BY published_date DESC');
            $data = array('/', '/new');
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $i = 0;
            while($row = $stmt->fetch()){
                $results[$i] = $row;
                if($row['url'] === '/')
                    $url = '/';
                else
                    $url = substr($row['url'], 1); // Remove first slash '/' to make the URL relative for sites in subfolders

                $results[$i]['url'] = $url;
                $results[$i]['tags'] = self::contentTagsRead($row['id']);
                $results[$i]['author'] = self::usersRead($row['author']);
                $i++;
            }

            return $results;
        }
    }

    /**
     * Create a new page
     * @param int $contentID Content id to update
     * @param str $title
     * @param str $description
     * @param str $header
     * @param str $subheader
     * @param str $body
     * @param str $url
     * @param str $compiledHTML Compiled HTML of the entire page for the snapshot
     * @param str $type Type of page. e.g. 'blog', or 'page'
     * @param str $published 'Y' or 'N'
     * @param str $publishedDate Date the article was published on
     * @return boolean
     */
    public function contentUpdate($contentID, $title, $description, $header, $subheader, $featured, $body, $url, $author, $type, $published='N', $publishedDate=null){
        // Make sure URL starts with a slash '/'
        if(strpos($url, '/') !== 0)
            $url = '/' . $url;
        // Save to database
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'content SET title=?, description=?, header=?, subheader=?, featured=?, body=?, url=?, type=?, published=?, published_date=?, author=?, timestamp=? WHERE id=?');
        $data = array($title, $description, $header, $subheader, $featured, $body, $url, $type, $published, $publishedDate, $author, time(), $contentID);
        return $stmt->execute($data);
    }

    /**
     * Delete content
     * @param int $contentID Content ID
     * @return boolean
     */
    public function contentDelete($contentID){
        // Don't delete the 'new' page
        if($contentID != 1){
            $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'content WHERE id=?');
            $data = array($contentID);
            return $stmt->execute($data);
        } else
            return FALSE;
    }

    ##################################################
    #              Content Extras                    #
    ##################################################

    /**
     * Add extra content to a page
     * @param int $contentID Content ID
     * @param string $extra Content of the extra
     * @return boolean
     */
    public function contentExtrasCreate($contentID, $name, $extra)
    {
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'content_extras (content_id, name, extra) VALUES (?,?,?)');
        $data = array($contentID, $name, $extra);
        return $stmt->execute($data);
    }

    /**
     * Get all extra content for the page
     * @param int $contentID Content ID
     * @return array Array with strings of data
     */
    public function contentExtrasRead($contentID){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'content_extras WHERE content_id=?');
        $data = array($contentID);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $extras = array();

        while($row = $stmt->fetch())
            $extras[$row['name']] = $row['extra'];

        return $extras;
    }

    /**
     * Delete all extras for a page
     * @param int $contentID Content id
     * @return boolean
     */
    public function contentExtrasDelete($contentID){
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'content_extras WHERE content_id=?');
        $data = array($contentID);
        return $stmt->execute($data);
    }

    ##################################################
    #               Content Tags                     #
    ##################################################

    /**
     * Create a new tag for a page
     * @param int $contentID Content id
     * @param str $tag Tag
     * @return boolean
     */
    public function contentTagsCreate($contentID, $tag){
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'content_tags (content_id, tag) VALUES (?,?)');
        $data = array($contentID, strtolower(trim($tag)));
        return $stmt->execute($data);
    }

    /**
     * Get all tags for a page
     * @param int $contentID Content id
     * @return array Array of tags
     */
    public function contentTagsRead($contentID){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'content_tags WHERE content_id=?');
        $data = array($contentID);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $tags = array();
        while($row = $stmt->fetch())
            $tags[] = $row['tag'];

        return $tags;
    }

    /**
     * Delete all tags for a page
     * @param int $contentID Content id
     * @return boolean
     */
    public function contentTagsDelete($contentID){
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'content_tags WHERE content_id=?');
        $data = array($contentID);
        return $stmt->execute($data);
    }

    ##################################################
    #                   Files                        #
    ##################################################

    /**
     * Save a file to the 'uploads' folder. Insert record into database.
     * @return boolean
     */
    public function filesCreate($file=null)
    {
        $forbiddenFileType = FALSE;
        
        $fileExtensions = array(
            'xls',
            'csv',
            'mrd',
            'indd',
            'ai',
            'psd'
        );
        $compressedExtensions = array(
            'zip',
            'zipx',
            'gzip',
            'rar',
            'gz'
        );
        $spreadsheetExtensions = array(
            'xls',
            'xlsx',
            'xlr',
            'numbers',
            'ods',
            'wks'
        );
        $docExtensions = array(
            'doc',
            'docx',
            'odt',
            'pages',
            'rtf',
            'txt',
            'wps'
        );
        $videoExtensions = array(
            'mov',
            'mp4',
            'wmv',
            'ogg',
            'webm'
        );
        $audioExtensions = array(
            'mp3'
        );
        $imageExtensions = array(
            'jpg',
            'jpeg',
            'png',
            'gif',
            'svg',
            'tiff'
        );

        if($file)
        {
            $extension = end(explode('.',$file));

            if($extension === 'pdf')
                $type = 'pdf';
            else if($extension === 'ppt')
                $type = 'ppt';
            else if(in_array($extension, $spreadsheetExtensions))
                $type = 'spreadsheet';
            else if(in_array($extension, $docExtensions))
                $type = 'doc';
            else if(in_array($extension, $compressedExtensions))
                $type = 'compressed';
            else if(in_array($extension, $fileExtensions))
                $type = 'file';
            else if(strpos($file, 'youtube') || strpos($file, 'youtu.be') || strpos($file, 'vimeo')){
                $type = 'video';
                if(strpos($file, 'http') !== 0)
                    $file = 'http://' . $file;
            } else if(in_array(strtolower($extension), $videoExtensions))
                $type = 'video';
            else if(in_array(strtolower($extension), $audioExtensions))
                $type = 'audio';
            else if(in_array(strtolower($extension), $imageExtensions))
                $type = 'image';

            $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'files (filename, type, timestamp) VALUES (?,?,?)');
            $data = array($file, $type, time());
            return $stmt->execute($data);
        } else
        {
            $originalName = str_replace(' ', '_', $_FILES["file"]["name"]); // Replace spaces with underscores
            $nameParts = explode('.', $originalName);
            $extension = end($nameParts);
            $name = uniqid();
            $filename =  str_replace('&', '', $nameParts[0]) .'-'. $name . '.' . $extension;
            $tempPath = $_FILES[ 'file' ][ 'tmp_name' ];
            $dir = dirname( __FILE__ );
            $dir = str_replace('/core/app', '', $dir);
            $uploadPath = $dir . '/uploads/' . $filename;

            if($extension === 'pdf')
                $type = 'pdf';
            else if($extension === 'ppt')
                $type = 'ppt';
            else if(in_array($extension, $spreadsheetExtensions))
                $type = 'spreadsheet';
            else if(in_array($extension, $docExtensions))
                $type = 'doc';
            else if(in_array($extension, $compressedExtensions))
                $type = 'compressed';
            else if(in_array($extension, $fileExtensions))
                $type = 'file';
            else if(strpos($file, 'youtube') || strpos($file, 'youtu.be') || strpos($file, 'vimeo')){
                $type = 'video';
                if(strpos($file, 'http') !== 0)
                    $file = 'http://' . $file;
            } else if(in_array(strtolower($extension), $videoExtensions))
                $type = 'video';
            else if(in_array(strtolower($extension), $audioExtensions))
                $type = 'audio';
            else if(in_array(strtolower($extension), $imageExtensions))
                $type = 'image';
            else
                $forbiddenFileType = TRUE;

            // Make thumbnails
            $responsive = 'yes';
            foreach($this->thumbnailSizes as $size){
                if(!self::makeThumbnail($tempPath, "$dir/uploads/" . str_replace('&', '', $nameParts[0]) . "-$name-$size.$extension", $size, $size, 80))
                    $responsive = 'no';
            }

            if(!$forbiddenFileType && move_uploaded_file($tempPath, $uploadPath))
            {
                // Insert into database
                $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'files (filename, responsive, type, timestamp) VALUES (?,?,?,?)');
                if($type === 'video' && (strpos($file, 'youtube') || strpos($file, 'youtu.be') || strpos($file, 'vimeo')))
                    $data = array($filename, $responsive, $type, time());
                else {
                    $filename = 'uploads/' . $filename;
                    $data = array($filename, $responsive, $type, time());
                }
                $stmt->execute($data);
                return array('id'=>$this->pdo->lastInsertId(), 'filename'=>$filename, 'responsive'=>$responsive, 'type'=>$type);
            } else
                return FALSE;
        }
    }

    /**
     * Fetch files
     * @param int File ID
     * @param str Filename
     * @return array Array of files columns
     */
    public function filesRead($fileID=null, $filename=null){
        if($fileID) // Get a specific file record
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'files WHERE id=?');
            $data = array($fileID);
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $row = $stmt->fetch();
            // Get tags
            $files = array(
                'id' => $row['id'],
                'url' => $row['filename'],
                'responsive' => $row['responsive'],
                'type' => $row['type']
            );
        } else if($filename) // Find a filename with a specific name
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'files WHERE filename=?');
            $data = array($filename);
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $row = $stmt->fetch();
            // Get tags
            $files = array(
                'id' => $row['id'],
                'url' => $row['filename'],
                'responsive' => $row['responsive'],
                'type' => $row['type']
            );
        } else // Get all files
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'files ORDER BY timestamp DESC');
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $files = array();
            while($row = $stmt->fetch())
            {
                // Get tags
                $files[] = array(
                    'id' => $row['id'],
                    'filename' => $row['filename'],
                    'responsive' => $row['responsive'],
                    'type' => $row['type']
                );
            }
        }
        return $files;
    }

    /**
     * Delete a file from the uploads folder and the database
     * @param string $fileID File ID
     * @return boolean
     */
    public function filesDelete($fileID)
    {
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'files WHERE id=?');
        $data = array($fileID);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $row = $stmt->fetch();
        $filename = $row['filename'];

        // Delete file from db
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'files WHERE id=?');
        $data = array($fileID);
        $stmt->execute($data);

        // Delete tags of associated file
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'files_tags WHERE files_id=?');
        $data = array($fileID);
        $stmt->execute($data);

        $fileParts = explode('.', $filename);
        $name = $fileParts[0];
        $extension = $fileParts[1];

        // Remove thumbnails
        if(strpos($filename, 'uploads/') === 0){
            foreach($this->thumbnailSizes as $size)
                unlink($_SERVER['DOCUMENT_ROOT'] . "/$name-$size.$extension");
        }

        // Delete file from uploads folder
        return unlink($_SERVER['DOCUMENT_ROOT'] .'/'. $filename);
    }

    ##################################################
    #                     Menu                       #
    ##################################################

    /**
     * Create a new menu
     * @param string $name Name of the new menu
     * @return mixed Returns last insert ID on success. False on fail.
     */
    public function menusCreate($name)
    {
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'menus (name) VALUES (?)');
        $data = array($name);
        if($stmt->execute($data))
            return $this->pdo->lastInsertId();
        else
            return FALSE;
    }

    /**
     * Get all menus
     * @return array Array with 'id', 'name', 'menu', and 'area'
     */
    public function menusRead(){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'menus');
        $stmt->execute();
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $menus = array();
        while($row = $stmt->fetch())
            $menus[] = $row;

        return $menus;
    }

    /**
     * Save or update a menu in HTML
     * @param int Menu ID
     * @param str Menu name
     * @param str $menu Menu HTML
     * @param str Area. e.g. 'footer'
     * @return boolean
     */
    public function menusUpdate($menuID, $name, $menu, $area)
    {
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'menus SET name=?, menu=?, area=? WHERE id=?');
        $data = array($name, $menu, $area, $menuID);
        return $stmt->execute($data);
    }

    /**
     * Delete a menu
     * @param int $menuID Menu ID
     * @return boolean
     */
    public function menusDelete($menuID)
    {
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'menus WHERE id=?');
        $data = array($menuID);
        return $stmt->execute($data);
    }

    ##################################################
    #                     Misc                       #
    ##################################################

    /**
     * Create a new misc record
     * @param string $name Name of the new menu
     * @return mixed Returns last insert ID on success. False on fail.
     */
    public function miscCreate($name, $value)
    {
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'misc (name, value) VALUES (?,?)');
        $data = array($name, $value);
        if($stmt->execute($data))
            return $this->pdo->lastInsertId();
        else
            return FALSE;
    }

    /**
     * Get a misc item by it's name
     * @param str Name to search for
     * @return str Value
     */
    public function miscRead($name){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'misc WHERE name=?');
        $data = array($name);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $row = $stmt->fetch();
        if($row && $row['value'])
            return $row['value'];
        else
            return '';
    }

    /**
     * Update a misc record
     * @param str $name Name of the record to modify
     * @param str $value New value of the record
     * @return boolean
     */
    public function miscUpdate($name, $value)
    {
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'misc SET value=? WHERE name=?');
        $data = array($value, $name);
        return $stmt->execute($data);
    }

    /**
     * Delete a misc record
     * @param str $name Name of the record to delete
     * @return boolean
     */
    public function miscDelete($name)
    {
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'misc WHERE name=?');
        $data = array($name);
        return $stmt->execute($data);
    }

    ##################################################
    #                   Modules                      #
    ##################################################

    /**
     * Install a module
     * @param string $module Module name
     * @return boolean
     */
    public function modulesCreate($module)
    {
        // Add module to database
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'modules (module, status) VALUES (?,?)');
        $data = array($module, 'active');
        if($stmt->execute($data))
            return $this->pdo->lastInsertId();
        else
            return FALSE;
    }

    /**
     * Fetch all modules
     * @return array 2d array with all modules
     */
    public function modulesRead()
    {
        // Get all module folders
        $i = 0;
        foreach (glob('../../modules/*') as $module)
        {
            $moduleFolder = str_replace('../../modules/', '', $module);
            $modules[$i] = json_decode(file_get_contents("../../modules/$moduleFolder/cosmo.json"));
            $modules[$i]->folder = $moduleFolder;
            $modules[$i]->status = 'uninstalled';
            $i++;
        }

        // Check installed modules
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'modules');
        $stmt->execute();
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        while($row = $stmt->fetch())
        {
            for($i=0; $i < count($modules); $i++)
            {
                if($modules[$i]->folder === $row['module']){
                    $modules[$i]->id = $row['id'];
                    $modules[$i]->status = $row['status'];
                }
            }
        }
        return $modules;
    }

    /**
     * Update the module's status
     * @param str $module Module name
     * @param str $status Status. active or inactive
     * @return boolean
     */
    public function modulesUpdate($moduleID, $status)
    {
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'modules SET status=? WHERE id=?');
        $data = array($status, $moduleID);
        return $stmt->execute($data);
    }

    /**
     * Activate a module
     * @param string $module Module name
     * @return boolean
     */
    public function modulesDelete($moduleID)
    {
        // Delete a module
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'modules WHERE id=?');
        $data = array($moduleID);
        return $stmt->execute($data);
    }

    ##################################################
    #                  Passwords                     #
    ##################################################

    /**
     * Securely encrypt passwords. Uses bcrypt if available, otherwise uses SHA512
     * @param string $password Password to encrypt
     * @param INT $rounds Number of rounds for bcrypt algo. Between 04 and 31. Higher numbers are more secure, but take longer
     * @return string Returns encrypted password
     */
    public function encrypt($password, $rounds=12)
    {
        // Check if blowfish algorithm is installed
        if(CRYPT_BLOWFISH === 1)
        {
            $uniqueSalt = substr(str_replace('+', '.', base64_encode(pack('N4', mt_rand(), mt_rand(), mt_rand(), mt_rand()))), 0, 22);

            // Check which version of blowfish we should use depending on the PHP version
            if(version_compare(PHP_VERSION, '5.3.7') >= 0)
                $version = 'y';
            else
                $version = 'a';

            $encryptedPassword = crypt($password, '$2' . $version . '$' . $rounds . '$' . $uniqueSalt);
        }
        else # Use SHA512 if blowfish isn't available
            $encryptedPassword = hash('SHA512', $password);

        return $encryptedPassword;
    }

    /**
     * Use to check password encrypted with the encrypt() function
     * @param string $username User's entered username
     * @param string $password User's entered password
     * @return mixed User's ID if the passwords match, false if they don't
     */
    public function passwordVerify($username, $password)
    {
        // Get the password stored with the given username
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'users WHERE username=?');
        $data = array(strtolower($username));
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $row = $stmt->fetch();
        $dbPassword = $row['password'];

        // Check if the password was encrypted with blowfish
        if(strpos($dbPassword, '$2y$') === 0 || strpos($dbPassword, '$2a$') === 0)
        {
            // Check which version of blowfish we should use depending on the PHP version
            if(version_compare(PHP_VERSION, '5.3.7') >= 0)
                $version = 'y';
            else
                $version = 'a';

            $encryptedPassword = crypt($password, $dbPassword);
        }
        else # Use SHA512 if blowfish isn't available
            $encryptedPassword = hash('SHA512', $password);

        if($dbPassword === $encryptedPassword)
            return $row['id'];
        else
            return FALSE;
    }

    /**
     * Reset user's password.
     * @param str $username Username
     * @return mixed Returns secret one-time-use password reset link on success, FALSE on fail.
     */
    public function passwordReset($username)
    {
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'users WHERE username=?');
        $data = array(strtolower($username));
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $row = $stmt->fetch();

        if($stmt->rowCount()){
            // Encrypted string with hashed password, salt, and timestamp in hours.
            // Password makes it one-time-use, salt makes it un-duplicateable, timestamp makes it temporary
            $token = $this->encrypt($row['password'] . $this->salt . round(time()/3600));
            $url = 'http://'. $_SERVER['HTTP_HOST'] . $this->prefix . '/reset/'. $row['id'] .'/'. $token;
            $body = 'A request to reset your password has been made. To reset your password, click '. $url .'. If this request was not made by you, ignore this email.';
            $this->email($row['email'], 'Reset your Password', $body);
        } else
            return FALSE;
    }

    /**
     * Verify that the reset token is valid
     * @param str $userID User's ID
     * @param str $token Token to verify
     * @return boolean Returns TRUE on valid token, FALSE on invalid token.
     */
    public function passwordResetVerify($userID, $token)
    {
        // Check if the token is still valid (created in the last 48 hours)
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'users WHERE id=?');
        $data = array($userID);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $row = $stmt->fetch();
        $currentHour = round(time()/3600);
        // Check if this token was made in the last 48 hours
        for($i=0; $i<=48; $i++)
        {
            if($token === $this->encrypt($row['password'] . $this->salt . ($currentHour - $i)))
                return TRUE;
        }
        return FALSE;
    }

    ##################################################
    #                Revisions                       #
    ##################################################

    /**
     * Create a new revision
     * @param int $contentID Content ID this is a revision of
     * @param str $title
     * @param str $description
     * @param str $header
     * @param str $subheader
     * @param str $body
     * @param str $url
     * @param str $compiledHTML Compiled HTML of the entire page for the snapshot
     * @param str $type Type of page. e.g. 'blog', or 'page'
     * @param str $published 'Y' or 'N'
     * @param str $publishedDate Date the article was published on
     * @return mixed Revision id on true, false on fail
     */
    public function revisionsCreate($contentID, $title, $description, $header, $subheader, $featured, $body, $url, $type, $published, $publishedDate, $author){
        if($url){
            // Make sure URL starts with a slash '/'
            if(strpos($url, '/') !== 0)
                $url = '/' . $url;
            $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'revisions (content_id, title, description, header, subheader, featured, body, url, type, published, published_date, author, timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $data = array($contentID, $title, $description, $header, $subheader, $featured, $body, $url, $type, $published, $publishedDate, $author, time());
            if($stmt->execute($data))
                return $this->pdo->lastInsertId();
            else
                return FALSE;
        }
    }

    /**
     * Get all revisions
     * @param str $url URL
     * @return array 2d array with 'title', 'url', 'type', 'pulished', 'timestamp' fields
     */
    public function revisionsRead($revisionID, $contentID)
    {
        $revisions = array();
        if($revisionID) // Get a specific record
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'revisions WHERE id=?');
            $data = array($revisionID);
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            while($row = $stmt->fetch())
                $revisions[] = $row;
        } else // Get all records associated with a specific page
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'revisions WHERE content_id=? ORDER BY timestamp DESC LIMIT 100');
            $data = array($contentID);
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            while($row = $stmt->fetch())
                $revisions[] = $row;
        }

        return $revisions;
    }

    /**
     * Delete revision
     * @param int $revisionID Revision ID
     * @return boolean
     */
    public function revisionsDelete($revisionID, $contentID){
        if($revisionID)
        {
            $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'revisions WHERE id=?');
            $data = array($revisionID);
            return $stmt->execute($data);
        } else if($contentID)
        {
            $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'revisions WHERE content_id=?');
            $data = array($contentID);
            return $stmt->execute($data);
        }
    }

    /**
     * Delete all revisions for a piece of content
     * @param int $contentID Content ID you are deleting
     * @return boolean
     */
    public function revisionsDeleteAll($contentID){

    }

    ##################################################
    #             Revisions Extras                   #
    ##################################################

    /**
     * Add extra content to a page
     * @param int $revisionID Revision ID
     * @param int $contentID Content ID
     * @param string $extra Content of the extra
     * @return boolean
     */
    public function revisionsExtrasCreate($revisionID, $contentID, $name, $extra)
    {
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'revisions_extras (revisions_id, content_id, name, extra) VALUES (?,?,?,?)');
        $data = array($revisionID, $contentID, $name, $extra);
        return $stmt->execute($data);
    }

    /**
     * Get all extra content for the page
     * @param int $contentID Content ID
     * @return array Array with strings of data
     */
    public function revisionsExtrasRead($revisionID){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'revisions_extras WHERE revisions_id=?');
        $data = array($revisionID);
        $stmt->execute($data);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        while($row = $stmt->fetch())
            $extras[$row['name']] = $row['extra'];

        return $extras;
    }

    /**
     * Delete all extras for a page
     * @param int $contentID Content id
     * @return boolean
     */
    public function revisionsExtrasDelete($contentID){
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'revisions_extras WHERE content_id=?');
        $data = array($contentID);
        return $stmt->execute($data);
    }

    ##################################################
    #                  Settings                      #
    ##################################################

    /**
     * Get the settings
     * @return boolean
     */
    public function settingsRead()
    {
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'settings');
        $stmt->execute();
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        return $stmt->fetch();
    }

    /**
     * Update the settings
     * @param str $siteName Site's name
     * @param str $slogan Site's slogan
     * @param str $logo URL for the logo
     * @param str $favicon URL for the favicon
     * @param str $email Email address
     * @param str $language Language preference. e.g. 'en' or 'es'
     * @param str $maintenanceURL Maintenance URL
     * @param str $maintenanceMode Maintenece Mode. 'true' or 'false'
     * return boolean
     */
    public function settingsUpdate($siteName, $slogan, $logo, $favicon, $email, $language, $maintenanceURL, $maintenanceMode)
    {
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'settings SET site_name=?, slogan=?, logo=?, favicon=?, email=?, language=?, maintenance_url=?, maintenance_mode=?');
        $data = array($siteName, $slogan, $logo, $favicon, $email, $language, $maintenanceURL, $maintenanceMode);
        return $stmt->execute($data);
    }

    ##################################################
    #                  Sitemaps                      #
    ##################################################

    /**
     * Create a new, empty sitemap file at the specified location
     * @param str $fileLocation Sitemap filename. e.g. /sitemap.xml
     * @return boolean
     */
    public function sitemapCreate($fileLocation)
    {
        $xmlFile = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
        $file = fopen($fileLocation, "w");
        fwrite($file,$xmlFile);
        fclose($file);
        return TRUE;
    }

    /**
     * Add a URL to the sitemap
     * @param str $fileLocation File name and location. e.g. /sitemap.xml
     * @param str $url URL to add
     * @param str $lastmod Last modified parameter
     * @param str $changefreq Change frequency parameter
     * @param int $priority Priority parameter
     * @return boolean
     */
    public function sitemapAddURL($fileLocation, $url, $lastmod, $changefreq, $priority=.5){
        // Get current sitemap
        $sitemapStr = file_get_contents($fileLocation);
        // Prepare new record
        $newRecord = '<url>';
        $newRecord .= '<loc>' . $url . '</loc>';
        $newRecord .= '<lastmod>' . $lastmod . '</lastmod>';
        $newRecord .= '<changefreq>' . $changefreq . '</changefreq>';
        $newRecord .= '<priority>' . $priority . '</priority>';
        $newRecord .= '</url>';
        $updatedSitemap = str_replace('</urlset>', $newRecord . '</urlset>', $sitemapStr);

        // Save updated Sitemap
        $file = fopen($fileLocation, "w");
        fwrite($file,$updatedSitemap);
        fclose($file);
        return TRUE;
    }

    /**
     * Remove a URL from the sitemap
     * @param str $fileLocation Location of the sitemap. e.g. /sitemap.xml
     * @param str $url URL to remove
     * @return boolean
     */
    public function sitemapRemoveURL($fileLocation, $url)
    {
        $doc = new DOMDocument;
        $doc->preserveWhiteSpace = FALSE;
        $doc->load($fileLocation);

        $xPath = new DOMXPath($doc);
        $query = sprintf('//url[./loc[contains(., "%s")]]', $url);
        foreach($xPath->query($query) as $node) {
            $node->parentNode->removeChild($node);
        }
        $doc->formatOutput = TRUE;
        $updatedSitemap = $doc->saveXML();

        // Save updated Sitemap
        $file = fopen($fileLocation, "w");
        fwrite($file,$updatedSitemap);
        fclose($file);
        return TRUE;
    }

    ##################################################
    #                   Themes                       #
    ##################################################

    /**
     * Get all themes in the 'themes' folder
     * @param string $themeID Name of the theme. e.g. 'default'
     * @return array Array with all 'name' of the folders
     */
    public function themesRead($themeID=NULL)
    {
        $themes = array();
        if($themeID)
        {
            foreach(glob("../../themes/$themeID/*") as $theme)
            {
                // Only return the html files
                if(strpos($theme, '.html'))
                    $themes[] = array('type' => str_replace("../../themes/$themeID/", '', $theme));
            }
        } else
        {
            // Get all theme folders
            foreach(glob('../../themes/*') as $theme)
                $themes[] = array('name' => str_replace('../../themes/', '', $theme));
        }

        return $themes;
    }

    /**
     * Set the new theme
     * @param str $theme Name of the theme
     * @return boolean
     */
    public function themesUpdate($theme){
        $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'settings SET theme=?');
        $data = array($theme);
        return $stmt->execute($data);
    }

    ##################################################
    #                    Tokens                      #
    ##################################################

    /**
     * Save a token to the database
     * @param string $usersID User's ID
     * @return mixed Returns token on success, FALSE on fail
     */
    public function tokensCreate($usersID)
    {
        $token = $this->randomCharGenerator();
        $hashedToken = $this->encrypt($token);
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'tokens (users_id, token) VALUES (?,?)');
        $data = array(strtolower($usersID), $hashedToken);
        if($stmt->execute($data))
            return $hashedToken;
        else
            return FALSE;
    }

    /**
     * Check if token and username combination are valid
     * @param string $usersID User's ID
     * @param string $token Token
     * @return mixed Returns new token on success, false on fail.
     */
    public function tokensRead($usersID, $token){
        $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'tokens WHERE users_id=? AND token=?');
        $data = array($usersID, $token);
        $stmt->execute($data);
        if($stmt->rowCount())
            return TRUE;
        else
        {
            // Invalid token was used. Token could have been compromised, delete all tokens for security.
            $this->tokensDelete($usersID);
            return FALSE;
        }
    }

    /**
     * Delete a specific token, or all tokens
     * @param string $username Username
     * @param string $token Token
     * @return boolean
     */
    public function tokensDelete($usersID, $token=null){
        if($token) // Delete given token
        {
            $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'tokens WHERE users_id=? AND token=?');
            $data = array($usersID, $token);
            return $stmt->execute($data);
        } else // Delete all tokens for this user
        {
            $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'tokens WHERE users_id=?');
            $data = array($usersID);
            return TRUE; // $stmt->execute($data); // Seems to get called on valid tokens
        }
    }



    ##################################################
    #                User Management                 #
    ##################################################

    /**
     * Create a new user
     * @param string $username Username
     * @param string $password Unencrypted password
     * @return mixed Returns id on insert. False if there was an error
     */
    public function usersCreate($username, $email, $password, $role)
    {
        $stmt = $this->pdo->prepare('INSERT INTO '.$this->prefix.'users (username, email, password, role) VALUES (?,?,?,?)');
        $data = array(strtolower($username), $email, $this->encrypt($password), $role);
        return $stmt->execute($data);
    }

    /**
     * List all users
     * @param int $usersID User's ID
     * @param str $keyword Search user's info for this string in username/email columns
     * @return array Array of all user(s) info (except password)
     */
    public function usersRead($usersID=NULL, $keyword=NULL)
    {
        if($usersID) // Get a specific user's info
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'users WHERE id=?');
            $stmt->execute(array($usersID));
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $row = $stmt->fetch();
            $users = array(
                'id' => $row['id'],
                'username'=>$row['username'],
                'name'=>$row['name'],
                'photo'=>$row['photo'],
                'bio'=>$row['bio'],
                'facebook'=>$row['facebook'],
                'twitter'=>$row['twitter'],
                'role'=>$row['role'],
                'email'=>$row['email']
            );
        } else if($keyword) // Get users similar to a keyword
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'users WHERE username LIKE ? OR email LIKE ? LIMIT 250');
            $data = array('%' . $keyword . '%', '%' . $keyword . '%');
            $stmt->execute($data);
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $users = array();
            while($row = $stmt->fetch())
                $users[] = array(
                    'id'=>$row['id'],
                    'username'=>$row['username'],
                    'name'=>$row['name'],
                    'email'=>$row['email'],
                    'role'=>$row['role']
                );
        } else // Get all users
        {
            $stmt = $this->pdo->prepare('SELECT * FROM '.$this->prefix.'users');
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $users = array();
            while($row = $stmt->fetch())
                $users[] = array(
                    'id' => $row['id'],
                    'username'=>$row['username'],
                    'name'=>$row['name'],
                    'photo'=>$row['photo'],
                    'facebook'=>$row['facebook'],
                    'twitter'=>$row['twitter'],
                    'role'=>$row['role'],
                    'email'=>$row['email']
                );
        }

        return $users;
    }

    /**
     * Login a user
     * @param string $username Username
     * @param srting $password Password
     * @return mixed Returns the token on success, FALSE on fail.
     */
    public function userLogin($username, $password)
    {
        $usersID = $this->passwordVerify($username, $password);
        if($usersID)
        {
            $roleRecord = $this->usersRead($usersID);
            if($roleRecord && $roleRecord['role'])
                $role = $roleRecord['role'];
            else
                $role = 'Guest';
            
            return array(
                'id' => $usersID,
                'username' => strtolower($username),
                'token' => $this->tokensCreate($usersID),
                'role' => $role
            );
        } else
            return FALSE;
    }

    /**
     * Change a user's username, email, role, or password
     * @param int $userID User's ID to be updated
     * @param string $username New username
     * @param string $role User's role
     * @param string $email New email
     * @param string $password New password
     * @return boolean Returns true on successful update, false on error
     */
    public function usersUpdate($userID, $username=NULL, $name=NULL, $photo=NULL, $bio=NULL, $facebook=NULL, $twitter=NULL, $role=NULL, $email=NULL, $password=NULL)
    {
        // Edit basic user info
        if(!empty($userID)){
            if($role) // Edit the role as well as the other info (only allowed by admins for security)
            {
                $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'users SET name=?, photo=?, bio=?, facebook=?, twitter=?, role=?, email=? WHERE id=?');
                $data = array($name, $photo, $bio, $facebook, $twitter, $role, $email, $userID);
            } else {
                $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'users SET name=?, photo=?, bio=?, facebook=?, twitter=?, email=? WHERE id=?');
                $data = array($name, $photo, $bio, $facebook, $twitter, $email, $userID);
            }
            return $stmt->execute($data);
        }else if(!empty($username)) // Update username
        {
            $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'users SET username=? WHERE id=?');
            $data = array($username, $userID);
            return $stmt->execute($data);
        }else if(!empty($email)) // Update email
        {
            $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'users SET email=? WHERE id=?');
            $data = array($email, $userID);
            return $stmt->execute($data);
        } else if(!empty($password)) // Reset password
        {
            $stmt = $this->pdo->prepare('UPDATE '.$this->prefix.'users SET password=? WHERE id=?');
            $data = array($this->encrypt($password), $userID);
            return $stmt->execute($data);
        }
    }

    /**
     * Delete a user
     * @param INT $userID User's ID to delete
     * @return boolean Returns true on successful delete, false on error
     */
    public function usersDelete($userID)
    {
        $stmt = $this->pdo->prepare('DELETE FROM '.$this->prefix.'users WHERE id=?');
        $data = array($userID);
        return $stmt->execute($data);
    }



    ##################################################
    #                     Misc.                      #
    ##################################################

    /**
     * Generate a random 128 character string
     * @param int $chars Number of characters in string. Default is 128
     * @return string String with random characters
     */
    public function randomCharGenerator($chars=128){
        $random_string = "";
        for ($i = 0; $i < $chars; $i++)
        {
            $random_char = chr(round( mt_rand(33, 125)));
            if($random_char !== ';')
                $random_string .= $random_char;
            else
                $i--;
        }

        return $random_string;
    }

    /**
     * Original source: https://stackoverflow.com/questions/12661/efficient-jpeg-image-resizing-in-php
     * Resize images for thumbnails/mobile
     * @param str $sourcefile
     * @param str $endfile
     * @param int $thumbwidth
     * @param int $thumbheight
     * @param int $quality
     */
    public function makeThumbnail($sourcefile, $endfile, $thumbwidth, $thumbheight, $quality){
        // Takes the sourcefile (path/to/image.jpg) and makes a thumbnail from it
        // and places it at endfile (path/to/thumb.jpg).

        // Load image and get image size.
        $type = exif_imagetype($sourcefile); // [] if you don't have exif you could use getImageSize()
        switch ($type) {
            case 1 :
                $img = imageCreateFromGif($sourcefile);
                break;
            case 2 :
                $img = imageCreateFromJpeg($sourcefile);
                break;
            case 3 :
                $img = imageCreateFromPng($sourcefile);
                break;
            case 6 :
                $img = imageCreateFromBmp($sourcefile);
                break;
        }

        $width = imagesx($img);
        $height = imagesy($img);

        // Don't make images larger than the original
        if($thumbwidth > $width)
            $thumbwidth = $width;
        if($thumbheight > $height)
            $thumbheight = $height;

        // Resized dimensions
        $newwidth = $thumbwidth;
        $divisor = $width / $thumbwidth;
        $newheight = floor($height / $divisor);
        
        // Create a new temporary image.
        $tmpimg = imagecreatetruecolor($newwidth, $newheight);

        // Copy and resize old image into new image.
        imagecopyresampled($tmpimg, $img, 0, 0, 0, 0, $newwidth, $newheight, $width, $height);

        // Save thumbnail into a file.
        $returnVal = imagejpeg($tmpimg, $endfile, $quality);

        // Release the memory
        imagedestroy($tmpimg);
        imagedestroy($img);

        return $returnVal;
    }

    /**
     * Save a file to the 'uploads' folder. Insert record into database.
     * @return boolean
     */
    public function email($to, $subject, $message)
    {
        return mail($to, $subject, $message);
    }
}

?>