<?php

/*
This file is used to bypass the same-origin policy for AJAX requests,
for demonstration purposes only. For production, it's recommended to
host the document viewer on the same server as the images, as this
method will introduce a slight delay to the process.
*/

$d = isset($_GET['d']) ? $_GET['d'] : 'beromunster';

echo file_get_contents("http://ddmal.music.mcgill.ca/divaserve.php?d=$d&z=$z", false, NULL);

?>
