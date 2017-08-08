import os
from binascii import a2b_base64
from rodan.settings import MEDIA_URL, MEDIA_ROOT
from rodan.jobs.base import RodanTask

def media_file_path_to_public_url(media_file_path):
    chars_to_remove = len(MEDIA_ROOT)
    return os.path.join(MEDIA_URL, media_file_path[chars_to_remove:])

class DivaInteractive(RodanTask):
    name = 'Pixel.js'
    author = 'Zeyad Saleh, Ke Zhang & Andrew Hankinson'
    description = 'Pixel-level ground truth creation and correction'
    settings = {}
    enabled = True
    category = 'Diva - Pixel.js'
    interactive = True
    input_port_types = [
        {
            'name': 'PNG - Layer 1 Input',
            'resource_types': ['image/rgb+png'],
            'minimum': 0,
            'maximum': 1,
            'is_list': False
        },
        {
            'name': 'PNG - Layer 2 Input',
            'resource_types': ['image/rgb+png'],
            'minimum': 0,
            'maximum': 1,
            'is_list': False
        },
        {
            'name': 'PNG - Layer 3 Input',
            'resource_types': ['image/rgb+png'],
            'minimum': 0,
            'maximum': 1,
            'is_list': False
        },
    ]
    output_port_types = [
        # {'name': 'Text output', 'minimum': 1, 'maximum': 1, 'resource_types': ['text/plain']},
        {
            'name': 'PNG - Layer 1 Output',
            'resource_types': ['image/rgb+png'],
            'minimum': 1,
            'maximum': 1,
            'is_list': False
        },
        {
            'name': 'PNG - Layer 2 Output',
            'resource_types': ['image/rgb+png'],
            'minimum': 1,
            'maximum': 1,
            'is_list': False
        },
        {
            'name': 'PNG - Layer 3 Output',
            'resource_types': ['image/rgb+png'],
            'minimum': 1,
            'maximum': 1,
            'is_list': False
        },
    ]
    def get_my_interface(self, inputs, settings):
	# Get input.
        layer1_url = ''
        layer2_url = ''
        layer3_url = ''
        if 'PNG - Layer 1 Input' in inputs:
            layer1_path = inputs['PNG - Layer 1 Input'][0]['resource_path']
            layer1_url = media_file_path_to_public_url(layer1_path)

        if 'PNG - Layer 2 Input' in inputs:
            layer2_path = inputs['PNG - Layer 2 Input'][0]['resource_path']
            layer2_url = media_file_path_to_public_url(layer2_path)

        if 'PNG - Layer 3 Input' in inputs:
            layer3_path = inputs['PNG - Layer 3 Input'][0]['resource_path']
            layer3_url = media_file_path_to_public_url(layer3_path)

    	# Create data to pass.
    	data = {
            'layer1_url' : layer1_url,
            'layer2_url' : layer2_url,
            'layer3_url' : layer3_url,
        }
    	return ('index.html', data)

    def run_my_task(self, inputs, settings, outputs):
        if '@done' not in settings:
            return self.WAITING_FOR_INPUT() 

        list=settings['@user_input']    # List passed having the image data (base 64) from all layer

        for i in range(0, len(list)):
            port = "PNG - Layer %d Output" % (i)
            if port in outputs:
                outfile_path = outputs[port][0]['resource_path']
                data = list[i].split(',')[1]    # Remove header from the base 64 string
                missing_padding = len(data) % 4
                
                if missing_padding != 0:
                    data += '=' * (4 - missing_padding % 4)

                binary_data = a2b_base64(data)   # Parse base 64 image data
                outfile = open(outfile_path + '.png', "wb")
                outfile.write(binary_data)
                outfile.close()
                os.rename(outputs[port][0]['resource_path']+'.png',outputs[port][0]['resource_path'])
        return True

    def validate_my_user_input(self, inputs, settings, user_input):
        return { '@done': True, '@user_input': user_input['user_input'] }

    def my_error_information(self, exc, traceback):
	pass
