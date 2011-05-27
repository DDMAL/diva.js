<?php

// Image directory. Images in this directory will be served by folder name,
// so if you have a folder named ...images/old_manuscript, a request for 
// divaserve.php?d=old_manuscript will use the images in that directory.
$IMAGE_DIR = "/Users/laurent/data/in_pyr";
$CACHE_DIR = "/tmp/diva.js";
$IIP_SERVER = "http://localhost/cgi-bin/iipsrv.fcgi?";

### Nothing should change past here.
$fid = preg_replace('/[^-a-zA-Z0-9_]/', '', $_GET['d']);
$zlv = preg_replace('/[^-a-zA-Z0-9_]/', '', $_GET['z']);

// where we will store the text files.
$imgcache = $CACHE_DIR . "/" . $fid;
$imgdir = $IMAGE_DIR . "/" . $fid;

if(!file_exists($imgcache)){
    mkdir($imgcache);
}

$gfile = $imgcache . "/" . "docdata.txt";

if($handle = opendir($imgdir)) {
    $imginfos = array();
    $filenum = 0;
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

?>