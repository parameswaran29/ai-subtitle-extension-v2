package com.example.aisubtitle;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Crucial: Allows the Chrome Extension to call this API without CORS errors
public class TranslateController {

    private final TranslateService translateService;

    public TranslateController(TranslateService translateService) {
        this.translateService = translateService;
    }

    @PostMapping("/translate")
    public TranslationResponse translate(@RequestBody TranslationRequest request) {
        System.out.println("Received request from Chrome. Subtitle provided: " + (request.getSubtitle() != null && !request.getSubtitle().isEmpty()) + ", Image provided: " + (request.getImageBase64() != null));
        return translateService.translate(request);
    }
}
