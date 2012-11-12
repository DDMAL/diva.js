<?php

$base_url = 'http://coltrane.music.mcgill.ca/fcgi-bin/iipsrv.fcgi?FIF=/mnt/images/beromunster/';

$f = (isset($_GET['f'])) ? $_GET['f'] : '';

$w = (isset($_GET['w'])) ? $_GET['w'] : '';

if ($f == '' || $w == '') {
    echo "Missing params";
} else {

    $image = file_get_contents($base_url . $f . '&WID=' . $w . '&CVT=JPG');

    header("Content-type: image/jpeg");
    echo $image;
}

?>
