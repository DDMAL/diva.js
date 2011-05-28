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

$t_wid_get = (isset($_GET['t_w'])) ? $_GET['t_w'] : 0;
$t_hei_get = (isset($_GET['t_h'])) ? $_GET['t_h'] : 0;
$t_wid = (intval($t_wid_get) > 0) ? intval($t_wid_get) : 256;
$t_hei = (intval($t_hei_get) > 0) ? intval($t_hei_get) : 256;

// where we will store the text files.
$img_cache = $CACHE_DIR . "/" . $dir;
$img_dir = $IMAGE_DIR . "/" . $dir;

$cache_file = $img_cache . "/" . "docdata.txt";
$pgs = array();

if (!file_exists($img_cache)) {
    // Now go through the image directory and calculate stuff
    mkdir($img_cache);
    $images = array();
    $lowest_max_zoom = 0;
    foreach (glob($img_dir . '/*.tif') as $img_file) {
        $img_size = getimagesize($img_file);
        $img_wid = $img_size[0];
        $img_hei = $img_size[1];
        
        $max_zoom = get_max_zoom_level($img_wid, $img_hei, $t_wid, $t_hei);
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
    for ($i = 0; $i < count($images); $i++) {
        if (array_key_exists($i, $images)) {
            $h = incorporate_zoom($images[$i]['mx_h'], $lowest_max_zoom - $zoom);
            $w = incorporate_zoom($images[$i]['mx_w'], $lowest_max_zoom - $zoom);
            $c = ceil($w / $t_wid);
            $r = ceil($h / $t_hei);
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
        }
    }
} else {
    // Assume that the cache directory already contains everything we need
}
/*
// Calculate the dimensions
$dims = array(
    'a_wid'         => $a_wid,
    'a_hei'         => $a_hei,
    'mx_h'          => $mx_h,
    'mx_w'          => $mx_w,
    't_hei'         => $t_hei,
    't_wid'         => $t_wid
);*/

// The full data to be returned
$data = array(
    'item_title'    => $dir,
    'dims'          => '',//$dims,
    'max_zoom'      => $lowest_max_zoom,
    'pgs'           => $pgs
);

echo json_encode($data);

/*
if($handle = opendir($img_dir)) {
    $img_info = array();
    $file_num = 0;
    $max_res_number = 0;
    
    while (false !== ($file = readdir($handle))) {
        
        if ($filenum > 10) {
           break;
        }
        
        if($file == "." && $file =="..") {
            continue;
        }
        
        $fullpath = $imgdir . "/" . $file;
        $pthpts = pathinfo($fullpath);
        $extn = $pthpts['extension'];
        $name = $pthpts['filename'];

        // echo $fullpath;

        if (($extn != "tif") && ($extn != "tiff")) {
            continue;
        }
        
        $filenum++;

        # check if a cached file of the image info exists for this image. If not, make one.
        $tfile = $imgcache . "/" . $name . ".txt";
        if(!file_exists($tfile)) {
            $image_array = array();
             
            $imginfo = file_get_contents($IIP_SERVER . "FIF=" . $fullpath . "&obj=IIP,1.0&obj=Max-size&obj=Tile-size&obj=Resolution-number", 'r');
            $t_array = split("\r\n", $imginfo);

            $mxs = split(":", $t_array[1]);
            $max_size = split(" ", $mxs[1]);

            $tls = split(":", $t_array[2]);
            $tile_size = split(" ", $tls[1]);

            $rsn = split(":", $t_array[3]);
            $res_number = (int) $rsn[1];
            
            if ($res_number > $max_res_number) {
                $max_res_number = $res_number;
            }
            
            $w = $max_size[0];
            $h = $max_size[1];
            $t_w = $tile_size[0];
            $t_h = $tile_size[1];

            $image_array = array(
                "w" => $w,
                "h" => $h,
                "r" => $max_res_number,
                "t_w" => $t_w,
                "t_h" => $t_h,
                "fn" => $fid . "/" . $file
                );
                
            array_push( $imginfos, $image_array );
        }
     }
        
     //print_r($res_number);
     for ($i=0; $i < $max_res_number; $i++) {
        
        $pgs = array();
        $max_width = 0;
        $max_height = 0;
        $avg_width = 0;
        $avg_height = 0;
        $total_width = 0;
        $total_height = 0;
        
        for($j=0; $j < $filenum; $j++) {
           
           $cur_res = $i;
           if ($imginfos[$j]["r"] - 1 < $i) {
              $cur_res = $imginfos[$j]["r"] - 1;
           }
           
           $w = $imginfos[$j]["w"];
           $h = $imginfos[$j]["h"];
           $t_w = $imginfos[$j]["t_w"];
           $t_h = $imginfos[$j]["t_h"];
           $zwid = $w / pow( 2, $imginfos[$j]["r"] - $cur_res - 2 );
           $zhei = $h / pow( 2, $imginfos[$j]["r"] - $cur_res - 2 );
           $row = ceil( $zhei / $t_h );
           $col = ceil( $zwid / $t_w );
           $tot = ( $row * $col );
           
           $imgresp = array(
               "w" => $zwid,
               "h" => $zhei,
               "z" => $i,
               "r" => $row,
               "c" => $col,
               "t_til" => $tot,
               "t_wid" => $t_w,
               "t_hei" => $t_h,
               "fn" => $imginfos[$j]["fn"]
               );
            
            array_push( $pgs, $imgresp );
            
           // update some global variables for this collection.
           if ($zwid > $max_width) {
               $max_width = $zwid;
           }
           if ($zhei > $max_height) {
               $max_height = $zhei;
           }
           $total_width += $zwid;
           $total_height += $zhei;
           
        }
        
        $dims = array(
            "mx_w" => $max_width,
            "mx_h" => $max_height,
            "t_wid" => $total_width,
            "t_hei" => $total_height,
            "a_wid" => $avg_width,
            "a_hei" => $avg_height
            );
            
         if ($zlv == $i) {
            break;
         }

      }
};

$resp = array(
    'dims' => $dims,
    'pgs' => $pgs
    //"item_title" => $fid
);

echo json_encode($resp);

exit;


$pgs = array();
if($handle = opendir($imgcache)) {
    while (false !== ($file = readdir($handle))) {
        if($file == "." || $file ==".." || $file == "docdata.txt") {
            continue;
        }
        $fullpath = $imgcache . "/" . $file;
        $pthpts = pathinfo($fullpath);
        $extn = $pthpts['extension'];
        $name = $pthpts['filename'];
        
        $imginfo = file_get_contents($fullpath);
        $f_data = unserialize($imginfo);
        $f_zdata = $f_data[$zlv]; // get the file's data at a given zoom level
        $pgs[] = $f_zdata;
    } //end while
} // end open handle
$f_dims = file_get_contents($gfile);
$dims = unserialize($f_dims);

$resp = array(
    'dims' => $dims,
    'pgs' => $pgs,
    "item_title" => $fid
);

echo json_encode($resp);
*/
?>
