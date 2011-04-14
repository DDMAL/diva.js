<?php

// Image directory. Images in this directory will be served by folder name,
// so if you have a folder named ...images/old_manuscript, a request for 
// divaserve.php?d=old_manuscript will use the images in that directory.
$IMAGE_DIR = "/home/wliu/images";
$CACHE_DIR = "/home/wliu/image-cache";
$IIP_SERVER = "http://petrucci.musiclibs.net:9002/fcgi-bin/iipsrv.fcgi?";

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
    $filenum = 0;
    $max_width = 0;
    $max_height = 0;
    $avg_width = 0;
    $avg_height = 0;
    $total_width = 0;
    $total_height = 0;
    while (false !== ($file = readdir($handle))) {
        $filenum++;
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

            //print_r($res_number);
            for ($i=0; $i <= $res_number - 1; $i++) {
                $w = $max_size[0];
                $h = $max_size[1];
                $t_w = $tile_size[0];
                $t_h = $tile_size[1];
                $zwid = $w / pow( 2, $i );
                $zhei = $h / pow( 2, $i );
                $row = ceil( $zhei / $t_h );
                $col = ceil( $zwid / $t_w );
                $tot = ( $row * $col );

                $image_array[$i] = array(
                    "w" => $zwid,
                    "h" => $zhei,
                    "z" => $i,
                    "r" => $row,
                    "c" => $col,
                    "t_til" => $tot,
                    "t_wid" => $t_w,
                    "t_hei" => $t_h,
                    "fn" => $file
                    );

                // update some global variables for this collection.
                if ($zwid > $max_width) {
                    $max_width = $zwid;
                }
                if ($zhei > $max_height) {
                    $max_height = $zhei;
                }
                $total_width += $zwid;
                $total_height += $zhei;
                
                $s_idata = serialize($image_array);
                file_put_contents($tfile, $s_idata);
                
            }
        }
        
        $avg_width = ceil($total_width / $filenum);
        $avg_height = ceil($total_height / $filenum);

        $dims = array(
            "mx_w" => $max_width,
            "mx_h" => $max_height,
            "t_wid" => $total_width,
            "t_hei" => $total_height,
            "a_wid" => $avg_width,
            "a_hei" => $avg_height
            );

        $s_gdata = serialize($dims);
        file_put_contents($gfile, $s_gdata);
    } // end while
    closedir($handle);
};


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
