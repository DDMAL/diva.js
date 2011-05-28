<?php

// Image directory. Images in this directory will be served by folder name,
// so if you have a folder named ...images/old_manuscript, a request for 
// divaserve.php?d=old_manuscript will use the images in that directory.
$IMAGE_DIR = "/mnt/images";
$CACHE_DIR = "/tmp/diva.js";

// only useful if you have memcache installed. 
$MEMCACHE_SERVER = "127.0.0.1";
$MEMCACHE_PORT = 11211;

// Nothing below this line should need to be changed
// -------------------------------------------------

function get_max_zoom_level($img_wid, $img_hei, $t_wid, $t_hei) {
    $largest_dim = ($img_wid > $img_hei) ? $img_wid : $img_hei;
    $t_dim = ($img_wid > $img_hei) ? $t_wid : $t_hei;

    $zoom_levels = ceil(log(($largest_dim + 1)/($t_dim + 1), 2));
    return intval($zoom_levels);
}

function incorporate_zoom($img_dim, $zoom_difference) {
    return $img_dim / pow(2, $zoom_difference);
}

function check_memcache() {
    global $MEMCACHE_SERVER, $MEMCACHE_PORT;
    if (extension_loaded('memcached')) {
    $m = new Memcached();
    $avail = $m->addServer($MEMCACHE_SERVER, $MEMCACHE_PORT);
        if ($avail) {
             return TRUE;
    } else {
         return FALSE;
    }
    } else {
    return FALSE;
    }
}

$MEMCACHE_AVAILABLE = check_memcache();
if($MEMCACHE_AVAILABLE) {
    $MEMCONN = new Memcached();
    $MEMCONN->addServer($MEMCACHE_SERVER, $MEMCACHE_PORT);
}

if (!isset($_GET['d']) || !isset($_GET['z'])) {
    die("Missing params");
}

$dir = preg_replace('/[^-a-zA-Z0-9_]/', '', $_GET['d']);
$zoom = preg_replace('/[^0-9]/', '', $_GET['z']);

$til_wid_get = (isset($_GET['w'])) ? $_GET['w'] : 0;
$til_hei_get = (isset($_GET['h'])) ? $_GET['h'] : 0;
$til_wid = (intval($til_wid_get) > 0) ? intval($til_wid_get) : 256;
$til_hei = (intval($til_hei_get) > 0) ? intval($til_hei_get) : 256;

// where we will store the text files.
$img_cache = $CACHE_DIR . "/" . $dir;
$img_dir = $IMAGE_DIR . "/" . $dir;

if ($MEMCACHE_AVAILABLE) {
     $cachekey = $dir . "-" . $zoom;
}

$gen_cache_file = $img_cache . '/docdata.txt';
$cache_file = $img_cache . '/docdata_' . $zoom . '.txt';
$pgs = array();

if (!file_exists($img_cache)) {
    // Now go through the image directory and calculate stuff
    mkdir($img_cache);
}

if (!file_exists($cache_file)) {
    $images = array();
    $lowest_max_zoom = 0;
    
    // Check if the general docdata.txt file exists (not zoom-level-specific)
    if (!file_exists($gen_cache_file)) {
        // Does not exist, so make it
        foreach (glob($img_dir . '/*.tif') as $img_file) {
            $img_size = getimagesize($img_file);
            $img_wid = $img_size[0];
            $img_hei = $img_size[1];
            
            $max_zoom = get_max_zoom_level($img_wid, $img_hei, $til_wid, $til_hei);
            $lowest_max_zoom = ($lowest_max_zoom > $max_zoom || $lowest_max_zoom == 0) ? $max_zoom : $lowest_max_zoom;
            
            // Get the number from the filename (between the last _ and .)
            $img_num = intval(substr($img_file, strrpos($img_file, '_') + 1, strrpos($img_file, '.') - strrpos($img_file, '_') - 1));
            
            // Figure out the image filename
            $img_fn = substr($img_file, strrpos($img_file, '/') + 1);

            $images[$img_num] = array(
                'mx_h'      => $img_hei,
                'mx_w'      => $img_wid,
                'mx_z'      => $max_zoom,
                'fn'        => $img_fn,
            );
            // Store the max zoom in $images[0] for now
            $images[0] = $lowest_max_zoom;
            file_put_contents($gen_cache_file, serialize($images));
        }
    } else {
        // Already exists - so store the contents in $pgs
        $images = unserialize(file_get_contents($gen_cache_file));
        $lowest_max_zoom = $images[0];
    }
    
    // Now go through them again, store in $pgs
    $mx_h = $mx_w = $t_wid = $t_hei = $num_pages = 0;
    for ($i = 1; $i < count($images); $i++) {
        if (array_key_exists($i, $images)) {
            $h = incorporate_zoom($images[$i]['mx_h'], $lowest_max_zoom - $zoom);
            $w = incorporate_zoom($images[$i]['mx_w'], $lowest_max_zoom - $zoom);
            $c = ceil($w / $til_wid);
            $r = ceil($h / $til_hei);
            $m_z = $images[$i]['mx_z'];
            $fn = $images[$i]['fn'];
            $pgs[] = array(
                'c'     => $c,
                'r'     => $r,
                'h'     => $h,
                'w'     => $w,
                'm_z'   => $m_z,
                'fn'    => $fn, 
            );
            $mx_h = ($h > $mx_h) ? $h : $mx_h;
            $mx_w = ($w > $mx_w) ? $w : $mx_w;
            $t_wid += $w;
            $t_hei += $h;
            $num_pages++;
        }
    }
    
    $a_wid = $t_wid / $num_pages;
    $a_hei = $t_hei / $num_pages;
    
    // Calculate the dimensions
    $dims = array(
        'a_wid'         => $a_wid,
        'a_hei'         => $a_hei,
        'mx_h'          => $mx_h,
        'mx_w'          => $mx_w,
        // t_hei and t_wid are slightly different from those returned by the django app ... why? 
        't_hei'         => $t_hei,
        't_wid'         => $t_wid
    );

    // The full data to be returned
    $data = array(
        'item_title'    => $dir,
        'dims'          => $dims,
        'max_zoom'      => $lowest_max_zoom,
        'pgs'           => $pgs
    );

    $json = json_encode($data);
    // Save it to a text file in the cache directory
    file_put_contents($cache_file, $json);
    
    if ($MEMCACHE_AVAILABLE) {
    $MEMCONN->set($cachekey, $json);
    }

    echo $json;
} else {
    // It might be useful to store a general docdata.txt sort of file as well
    if ($MEMCACHE_AVAILABLE) {
    if(!($json = $MEMCONN->get($cachekey))){
        if ($MEMCONN->getResultCode() == Memcached::RES_NOTFOUND) {
            $json = file_get_contents($cache_file);
            $MEMCONN->set($cachekey, $json);
        } 
    }
    } else {
        $json = file_get_contents($cache_file);
    }
    echo $json;
}

?>
