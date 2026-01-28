package com.indumine.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController // Add this to tell Spring this class handles Web URLs
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
        // If you want to print to the console when it starts:
        System.out.println("Backend is running on http://localhost:8080");
    }

    // This is your first route!
    @GetMapping("/api/status")
    public String status() {
        return "Spring Boot is active!";
    }

    @GetMapping("/api/hello")
    public String hello() {
        return "";
    }
}