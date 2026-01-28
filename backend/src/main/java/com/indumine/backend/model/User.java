package com.indumine.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false, length = 100)
    private String username;

    @Column(nullable = false)
    private String hashed_password;

    @Column(length = 200)
    private String full_name;

    @Column(nullable = false, length = 50)
    private String role = "user";

    private Boolean is_active = true;

    // Use List<String> instead of Map if your Python default was a list []
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private List<String> allowed_categories;

    // --- AUTOMATIC AUDIT FIELDS ---

    @CreationTimestamp // Automatically sets date on INSERT
    @Column(updatable = false, nullable = false)
    private LocalDateTime created_at;

    @UpdateTimestamp // Automatically updates date on UPDATE
    private LocalDateTime updated_at;

    private LocalDateTime last_login;

    private Long created_by;
    private Long updated_by;
}