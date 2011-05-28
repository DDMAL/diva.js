<?php

function get_max_zoom_level($img_wid, $img_hei, $t_wid, $t_hei) {
    $largest_dim = ($img_wid > $img_hei) ? $img_wid : $img_hei;
    $t_dim = ($img_wid > $img_hei) ? $t_wid : $t_hei;

    $zoom_levels = ceil(log(($largest_dim + 1)/($t_dim + 1), 2));
    return intval($zoom_levels);
}

function incorporate_zoom($img_dim, $zoom_difference) {
    return $img_dim / pow(2, $zoom_difference);
}

// Image directory. Images in this directory will be served by folder name,
// so if you have a folder named ...images/old_manuscript, a request for 
// divaserve.php?d=old_manuscript will use the images in that directory.
$IMAGE_DIR = "/mnt/images";
$CACHE_DIR = "/tmp/diva.js";
$IIP_SERVER = "http://localhost/cgi-bin/iipsrv.fcgi?";

### Nothing should change past here.
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

$cache_file = $img_cache . '/docdata_' . $zoom . '.txt';
$pgs = array();

if (!file_exists($img_cache)) {
    // Now go through the image directory and calculate stuff
    mkdir($img_cache);
}

if (!file_exists($cache_file)) {
    $images = array();
    $lowest_max_zoom = 0;
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
    }
    
    // Now go through them again, store in $pgs
    $mx_h = $mx_w = $t_wid = $t_hei = $num_pages = 0;
    for ($i = 0; $i < count($images); $i++) {
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
    echo $json;
} else {
    // It might be useful to store a general docdata.txt sort of file as well
    $json = file_get_contents($cache_file);
    echo $json;
}

?>
